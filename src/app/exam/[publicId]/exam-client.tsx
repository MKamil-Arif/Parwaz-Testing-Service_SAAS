"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CloudOff,
  Eraser,
  LayoutGrid,
  LoaderCircle,
  Send,
  Timer,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/site/logo";
import { cn } from "@/lib/cn";

export type ExamQuestion = {
  answerId: number;
  position: number;
  type: string;
  text: string;
  marks: number;
  options: { id: number; text: string }[];
  selectedOptionId: number | null;
  textAnswer: string;
  marked: boolean;
};

type AnswerState = { selected: number | null; text: string; marked: boolean };
type Update = { answerId: number; selectedOptionId: number | null; textAnswer: string | null; marked: boolean };
type SaveStatus = "saved" | "saving" | "offline" | "error";

type Props = {
  publicId: string;
  doneUrl: string;
  title: string;
  candidate: { name: string; registrationNumber: string };
  expiresAt: string;
  serverNow: string;
  negativeMarking: number;
  questions: ExamQuestion[];
};

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function ExamClient(props: Props) {
  const { publicId, questions } = props;
  const storageKey = `rp-exam-${publicId}`;

  const [answers, setAnswers] = useState<Record<number, AnswerState>>(() =>
    Object.fromEntries(questions.map((q) => [q.answerId, { selected: q.selectedOptionId, text: q.textAnswer, marked: q.marked }])),
  );
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Server-authoritative clock: remember the server/client offset and the server expiry.
  const offset = useRef(new Date(props.serverNow).getTime() - Date.now());
  const expiresAt = useRef(new Date(props.expiresAt).getTime());
  const [remaining, setRemaining] = useState(() => expiresAt.current - (Date.now() + offset.current));

  const pending = useRef(new Map<number, Update>());
  const flushing = useRef(false);
  const submittedRef = useRef(false);
  const inFlight = useRef(false);
  const textTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const persistPending = useCallback(() => {
    try {
      if (pending.current.size) localStorage.setItem(storageKey, JSON.stringify([...pending.current.values()]));
      else localStorage.removeItem(storageKey);
    } catch {
      /* storage unavailable (private mode) — server autosave still works */
    }
  }, [storageKey]);

  const finish = useCallback(() => {
    submittedRef.current = true;
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    window.location.href = props.doneUrl;
  }, [props.doneUrl, storageKey]);

  const flushRef = useRef<() => Promise<boolean>>(async () => true);
  const flush = useCallback(async (): Promise<boolean> => {
    if (pending.current.size === 0) return true;
    // A save is already in flight: changes made meanwhile are sent as soon as it returns.
    if (flushing.current) return false;
    flushing.current = true;
    setStatus("saving");
    const batch = [...pending.current.values()];
    try {
      const res = await fetch(`/api/exam/${publicId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: batch }),
      });
      if (res.status === 409) {
        finish();
        return false;
      }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { serverNow: string; expiresAt: string };
      offset.current = new Date(data.serverNow).getTime() - Date.now();
      expiresAt.current = new Date(data.expiresAt).getTime();
      for (const u of batch) if (pending.current.get(u.answerId) === u) pending.current.delete(u.answerId);
      persistPending();
      setStatus(pending.current.size ? "saving" : "saved");
      if (pending.current.size) setTimeout(() => void flushRef.current(), 0);
      return true;
    } catch {
      setStatus(navigator.onLine ? "error" : "offline");
      return false;
    } finally {
      flushing.current = false;
    }
  }, [finish, persistPending, publicId]);
  flushRef.current = flush;

  const queue = useCallback(
    (answerId: number, state: AnswerState, immediate = true) => {
      const q = questions.find((x) => x.answerId === answerId)!;
      pending.current.set(answerId, {
        answerId,
        selectedOptionId: q.type === "SHORT_ANSWER" ? null : state.selected,
        textAnswer: q.type === "SHORT_ANSWER" ? state.text : null,
        marked: state.marked,
      });
      persistPending();
      setStatus("saving");
      if (immediate) void flush();
    },
    [flush, persistPending, questions],
  );

  const report = useCallback(
    (type: string, details?: string) => {
      void fetch(`/api/exam/${publicId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: [{ type, details }] }),
        keepalive: true,
      }).catch(() => {});
    },
    [publicId],
  );

  const submit = useCallback(
    async (reason: "manual" | "timeout") => {
      if (submittedRef.current || inFlight.current) return;
      inFlight.current = true;
      setSubmitting(true);
      setSubmitError(null);
      // Drain every queued answer (waiting for an in-flight save) before the final submission.
      for (let i = 0; i < 20 && pending.current.size > 0; i++) {
        if (flushing.current) {
          await new Promise((r) => setTimeout(r, 150));
          continue;
        }
        if (!(await flush())) break;
      }
      try {
        const res = await fetch(`/api/exam/${publicId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });
        if (!res.ok && res.status !== 409) throw new Error(String(res.status));
        finish();
      } catch {
        // Allow another try (the timer retries a time-up submission every few seconds).
        setTimeout(() => (inFlight.current = false), 4000);
        setSubmitting(false);
        setSubmitError(
          navigator.onLine
            ? "Could not submit. Please try again."
            : "You are offline. Reconnect to submit — your answers are stored on this device. If time runs out, the answers already saved will be submitted automatically.",
        );
      }
    },
    [finish, flush, publicId],
  );

  // Recover unsaved changes from a previous page load (e.g. the phone lost connection and reloaded).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw) as Update[];
      const valid = saved.filter((u) => questions.some((q) => q.answerId === u.answerId));
      if (!valid.length) return;
      setAnswers((prev) => {
        const next = { ...prev };
        for (const u of valid) next[u.answerId] = { selected: u.selectedOptionId, text: u.textAnswer ?? "", marked: u.marked };
        return next;
      });
      for (const u of valid) pending.current.set(u.answerId, u);
      void flush();
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Timer + periodic retry of unsaved answers.
  useEffect(() => {
    const t = setInterval(() => {
      const left = expiresAt.current - (Date.now() + offset.current);
      setRemaining(left);
      if (left <= 0 && !submittedRef.current) void submit("timeout");
    }, 1000);
    const retry = setInterval(() => {
      if (pending.current.size) void flush();
    }, 5000);
    return () => {
      clearInterval(t);
      clearInterval(retry);
    };
  }, [flush, submit]);

  // Connectivity, integrity logging and leave-page warning.
  useEffect(() => {
    let lastHidden = 0;
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && Date.now() - lastHidden > 5000) {
        lastHidden = Date.now();
        report("TAB_HIDDEN");
      }
    };
    const block = (type: string) => (e: Event) => {
      e.preventDefault();
      report(type);
    };
    const onCopy = block("COPY_ATTEMPT");
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return report("PASTE_ATTEMPT", "pasted into written answer");
      e.preventDefault();
      report("PASTE_ATTEMPT");
    };
    const onContext = block("CONTEXT_MENU");
    const onOffline = () => {
      setStatus("offline");
      report("OFFLINE");
    };
    const onOnline = () => {
      report("RECONNECTED");
      void flush();
    };
    const onFullscreen = () => {
      if (!document.fullscreenElement) report("FULLSCREEN_EXIT");
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!submittedRef.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("fullscreenchange", onFullscreen);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("fullscreenchange", onFullscreen);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [flush, report]);

  const q = questions[index];
  const a = answers[q.answerId];

  const update = (patch: Partial<AnswerState>, immediate = true) => {
    const next = { ...answers[q.answerId], ...patch };
    setAnswers((prev) => ({ ...prev, [q.answerId]: next }));
    queue(q.answerId, next, immediate);
  };

  const onText = (text: string) => {
    const next = { ...answers[q.answerId], text };
    setAnswers((prev) => ({ ...prev, [q.answerId]: next }));
    const timers = textTimers.current;
    clearTimeout(timers.get(q.answerId));
    timers.set(
      q.answerId,
      setTimeout(() => queue(q.answerId, next), 800),
    );
  };

  const go = (i: number) => {
    setIndex(Math.max(0, Math.min(questions.length - 1, i)));
    setPaletteOpen(false);
    window.scrollTo({ top: 0 });
  };

  // Keyboard shortcuts: A–D / 1–4 select, ←/→ navigate, M marks.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (confirmOpen || (e.target as HTMLElement)?.tagName === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toUpperCase();
      const idx = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : ["1", "2", "3", "4", "5", "6"].indexOf(k);
      if (idx >= 0 && q.options[idx]) update({ selected: q.options[idx].id });
      else if (e.key === "ArrowRight") go(index + 1);
      else if (e.key === "ArrowLeft") go(index - 1);
      else if (k === "M") update({ marked: !a.marked });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const isAnswered = (s: AnswerState, type: string) => (type === "SHORT_ANSWER" ? !!s.text.trim() : s.selected !== null);
  const counts = useMemo(() => {
    let answered = 0,
      marked = 0;
    for (const qq of questions) {
      const s = answers[qq.answerId];
      if (isAnswered(s, qq.type)) answered++;
      if (s.marked) marked++;
    }
    return { answered, marked, unanswered: questions.length - answered };
  }, [answers, questions]);

  const danger = remaining < 60_000;
  const warn = remaining < 5 * 60_000;

  const palette = (
    <div>
      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8 lg:grid-cols-5">
        {questions.map((qq, i) => {
          const s = answers[qq.answerId];
          const answered = isAnswered(s, qq.type);
          return (
            <button
              key={qq.answerId}
              type="button"
              onClick={() => go(i)}
              aria-label={`Question ${i + 1}${answered ? ", answered" : ", not answered"}${s.marked ? ", marked for review" : ""}`}
              aria-current={i === index}
              className={cn(
                "relative grid h-10 place-items-center rounded-lg text-sm font-bold transition",
                answered ? "bg-brand-600 text-white" : "bg-white text-navy-700 ring-1 ring-navy-200",
                s.marked && !answered && "bg-gold-100 text-gold-700 ring-gold-300",
                i === index && "ring-2 ring-navy-950 ring-offset-2",
              )}
            >
              {i + 1}
              {s.marked && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-gold-400 ring-2 ring-white" />}
            </button>
          );
        })}
      </div>
      <ul className="mt-4 grid grid-cols-2 gap-2 text-xs text-navy-600">
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-brand-600" /> Answered ({counts.answered})
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-white ring-1 ring-navy-300" /> Not answered ({counts.unanswered})
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded bg-gold-100 ring-1 ring-gold-300" /> Marked ({counts.marked})
        </li>
        <li className="flex items-center gap-2">
          <span className="size-3.5 rounded ring-2 ring-navy-950" /> Current
        </li>
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col bg-surface select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-navy-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <LogoMark className="size-8 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{props.title}</p>
            <p className="truncate text-xs text-navy-300">
              {props.candidate.name} · {props.candidate.registrationNumber}
            </p>
          </div>
          <span
            className={cn(
              "hidden items-center gap-1.5 text-xs font-semibold sm:inline-flex",
              status === "saved" ? "text-emerald-300" : status === "saving" ? "text-navy-300" : "text-amber-300",
            )}
            aria-live="polite"
          >
            {status === "saved" && (
              <>
                <CircleCheck className="size-3.5" /> All answers saved
              </>
            )}
            {status === "saving" && (
              <>
                <LoaderCircle className="size-3.5 animate-spin" /> Saving…
              </>
            )}
            {(status === "offline" || status === "error") && (
              <>
                <CloudOff className="size-3.5" /> {status === "offline" ? "Offline — saved on device" : "Retrying save…"}
              </>
            )}
          </span>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-xl px-3 py-2 font-mono text-base font-bold tabular-nums",
              danger ? "animate-pulse bg-red-600" : warn ? "bg-amber-500 text-navy-950" : "bg-white/10",
            )}
            role="timer"
            aria-label="Time remaining"
          >
            <Timer className="size-4" /> {fmt(remaining)}
          </div>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="hidden h-10 items-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-bold text-navy-950 hover:bg-gold-300 sm:inline-flex"
          >
            <Send className="size-4" /> Submit
          </button>
        </div>
        {(status === "offline" || status === "error") && (
          <p className="bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-navy-950 sm:hidden">
            {status === "offline" ? "Offline — answers are kept on this device and will sync" : "Retrying save…"}
          </p>
        )}
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_300px]">
        {/* Question */}
        <section className="min-w-0" aria-labelledby="question-heading">
          <div className="rounded-3xl border border-navy-100 bg-white p-5 shadow-card sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p id="question-heading" className="text-sm font-bold text-brand-700">
                Question {index + 1} <span className="font-medium text-navy-400">of {questions.length}</span>
              </p>
              <p className="text-xs font-semibold text-navy-500">
                {q.marks} mark{q.marks === 1 ? "" : "s"}
                {props.negativeMarking > 0 && q.type !== "SHORT_ANSWER" ? ` · −${props.negativeMarking} if wrong` : ""}
              </p>
            </div>
            <p className="mt-4 text-lg leading-relaxed font-medium whitespace-pre-wrap text-navy-950 sm:text-xl">{q.text}</p>

            {q.type === "SHORT_ANSWER" ? (
              <div className="mt-6">
                <label htmlFor="text-answer" className="text-sm font-semibold text-navy-700">
                  Your answer (reviewed by an examiner)
                </label>
                <textarea
                  id="text-answer"
                  value={a.text}
                  onChange={(e) => onText(e.target.value)}
                  rows={6}
                  maxLength={5000}
                  className="mt-2 w-full rounded-xl border border-navy-200 p-3 text-base select-text focus:border-brand-500 focus:ring-3 focus:ring-brand-100 focus:outline-none"
                />
              </div>
            ) : (
              <fieldset className="mt-6 space-y-3">
                <legend className="sr-only">Choose one answer</legend>
                {q.options.map((o, i) => {
                  const selected = a.selected === o.id;
                  return (
                    <label
                      key={o.id}
                      className={cn(
                        "flex cursor-pointer items-start gap-4 rounded-2xl border-2 px-4 py-3.5 transition-colors",
                        selected ? "border-brand-600 bg-brand-50" : "border-navy-100 hover:border-navy-300 hover:bg-navy-50/50",
                      )}
                    >
                      <input
                        type="radio"
                        name={`q-${q.answerId}`}
                        checked={selected}
                        onChange={() => update({ selected: o.id })}
                        className="sr-only"
                      />
                      <span
                        className={cn(
                          "grid size-8 shrink-0 place-items-center rounded-lg text-sm font-bold",
                          selected ? "bg-brand-600 text-white" : "bg-navy-50 text-navy-700",
                        )}
                      >
                        {LETTERS[i]}
                      </span>
                      <span className="pt-1 text-[15px] leading-relaxed text-navy-900 sm:text-base">{o.text}</span>
                    </label>
                  );
                })}
              </fieldset>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-navy-100 pt-5">
              <button
                type="button"
                onClick={() => update({ marked: !a.marked })}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold ring-1",
                  a.marked ? "bg-gold-100 text-gold-700 ring-gold-300" : "text-navy-700 ring-navy-200 hover:bg-navy-50",
                )}
              >
                {a.marked ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                {a.marked ? "Marked for review" : "Mark for review"}
              </button>
              <button
                type="button"
                onClick={() => update(q.type === "SHORT_ANSWER" ? { text: "" } : { selected: null })}
                disabled={!isAnswered(a, q.type)}
                className="inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50 disabled:opacity-40"
              >
                <Eraser className="size-4" /> Clear answer
              </button>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  disabled={index === 0}
                  className="inline-flex h-10 items-center gap-1 rounded-xl px-3.5 text-sm font-semibold text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" /> Previous
                </button>
                {index < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => go(index + 1)}
                    className="inline-flex h-10 items-center gap-1 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    Next <ChevronRight className="size-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmOpen(true)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-gold-400 px-4 text-sm font-bold text-navy-950 hover:bg-gold-300"
                  >
                    <Send className="size-4" /> Review & submit
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="mt-3 hidden text-center text-xs text-navy-400 sm:block">Shortcuts: A–D select · ← → navigate · M mark for review</p>
        </section>

        {/* Palette (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-3xl border border-navy-100 bg-white p-5 shadow-card">
            <p className="mb-4 text-sm font-bold text-navy-950">Question palette</p>
            {palette}
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-navy-950 text-sm font-bold text-white hover:bg-navy-800"
            >
              <Send className="size-4" /> Submit examination
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile bottom bar */}
      <div className="sticky bottom-0 z-20 flex gap-2 border-t border-navy-100 bg-white p-3 lg:hidden">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-navy-800 ring-1 ring-navy-200"
        >
          <LayoutGrid className="size-4" /> Questions ({counts.answered}/{questions.length})
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gold-400 text-sm font-bold text-navy-950"
        >
          <Send className="size-4" /> Submit
        </button>
      </div>

      {paletteOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Question palette">
          <button type="button" className="absolute inset-0 bg-navy-950/50" aria-label="Close" onClick={() => setPaletteOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-bold">Question palette</p>
              <button type="button" onClick={() => setPaletteOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg ring-1 ring-navy-200">
                <X className="size-4" />
              </button>
            </div>
            {palette}
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <button type="button" className="absolute inset-0 bg-navy-950/60" aria-label="Close" onClick={() => !submitting && setConfirmOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-lift">
            <h2 id="confirm-title" className="text-xl font-bold">
              Submit your examination?
            </h2>
            <p className="mt-1 text-sm text-navy-600">You cannot change your answers after submitting.</p>
            <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-brand-50 p-3">
                <dd className="font-display text-2xl font-bold text-brand-700">{counts.answered}</dd>
                <dt className="text-xs font-semibold text-brand-800">Answered</dt>
              </div>
              <div className="rounded-xl bg-navy-50 p-3">
                <dd className="font-display text-2xl font-bold text-navy-800">{counts.unanswered}</dd>
                <dt className="text-xs font-semibold text-navy-600">Unanswered</dt>
              </div>
              <div className="rounded-xl bg-gold-50 p-3">
                <dd className="font-display text-2xl font-bold text-gold-700">{counts.marked}</dd>
                <dt className="text-xs font-semibold text-gold-700">Marked</dt>
              </div>
            </dl>
            {submitError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{submitError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={submitting}
                onClick={() => setConfirmOpen(false)}
                className="h-11 flex-1 rounded-xl text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50 disabled:opacity-50"
              >
                Keep working
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => submit("manual")}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-navy-950 text-sm font-bold text-white hover:bg-navy-800 disabled:opacity-60"
              >
                {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
                {submitting ? "Submitting…" : "Submit now"}
              </button>
            </div>
          </div>
        </div>
      )}

      {submitting && remaining <= 0 && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/80 text-center text-white">
          <div>
            <LoaderCircle className="mx-auto size-8 animate-spin" />
            <p className="mt-3 font-semibold">Time is up — submitting your answers…</p>
          </div>
        </div>
      )}
    </div>
  );
}
