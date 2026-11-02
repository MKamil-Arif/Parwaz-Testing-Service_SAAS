"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { FacebookIcon, WhatsAppIcon, XIcon } from "./brand-icons";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** Live countdown to a target time. Renders a stable placeholder on the server. */
export function Countdown({ target, light, doneText = "Now open" }: { target: string; light?: boolean; doneText?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = now === null ? null : new Date(target).getTime() - now;
  if (diff !== null && diff <= 0) return <span className="font-semibold">{doneText}</span>;
  const p = diff === null ? null : parts(diff);
  const cells: [string, number | undefined][] = [
    ["Days", p?.d],
    ["Hrs", p?.h],
    ["Min", p?.m],
    ["Sec", p?.s],
  ];
  return (
    <div className="flex gap-2" aria-live="off">
      {cells.map(([lbl, v]) => (
        <div
          key={lbl}
          className={cn(
            "min-w-[3.25rem] rounded-xl px-2 py-1.5 text-center",
            light ? "bg-white/10 ring-1 ring-white/15" : "bg-navy-50 ring-1 ring-navy-100",
          )}
        >
          <div className={cn("font-display text-lg font-bold tabular-nums", light ? "text-white" : "text-navy-950")}>
            {v === undefined ? "--" : String(v).padStart(2, "0")}
          </div>
          <div className={cn("text-[10px] font-semibold tracking-wider uppercase", light ? "text-navy-300" : "text-navy-500")}>{lbl}</div>
        </div>
      ))}
    </div>
  );
}

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          window.prompt("Copy this:", value);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-navy-800 ring-1 ring-navy-200 hover:bg-navy-50",
        className,
      )}
    >
      {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}

/** Share links for WhatsApp, Facebook and X; Instagram/TikTok have no web share URL, so "copy link" covers them. */
export function ShareButtons({ url, text, className }: { url: string; text: string; className?: string }) {
  const [absolute, setAbsolute] = useState(url);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (url.startsWith("/")) setAbsolute(window.location.origin + url);
  }, [url]);
  const enc = encodeURIComponent;
  const links = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${text} ${absolute}`)}`, Icon: WhatsAppIcon, cls: "hover:bg-emerald-50 hover:text-emerald-700" },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(absolute)}`, Icon: FacebookIcon, cls: "hover:bg-blue-50 hover:text-blue-700" },
    { name: "X", href: `https://x.com/intent/post?text=${enc(text)}&url=${enc(absolute)}`, Icon: XIcon, cls: "hover:bg-navy-50" },
  ];
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-navy-500">
        <Share2 className="size-4" /> Share
      </span>
      {links.map(({ name, href, Icon, cls }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${name}`}
          className={cn("grid size-9 place-items-center rounded-lg text-navy-600 ring-1 ring-navy-200 transition-colors", cls)}
        >
          <Icon className="size-4" />
        </a>
      ))}
      <button
        type="button"
        aria-label="Copy link (for Instagram, TikTok or anywhere)"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(absolute);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            window.prompt("Copy this link:", absolute);
          }
        }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50"
      >
        {copied ? <Check className="size-4 text-emerald-600" /> : <Link2 className="size-4" />}
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}

export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print inline-flex h-10 items-center gap-2 rounded-xl bg-navy-900 px-4 text-sm font-semibold text-white hover:bg-navy-800"
    >
      {label}
    </button>
  );
}
