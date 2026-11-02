"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { initialActionState, type ActionState } from "@/lib/action-state";
import { buttonClasses, type ButtonSize, type ButtonVariant } from "./button";
import { cn } from "@/lib/cn";

type Ctx = { state: ActionState; pending: boolean };
const FormStateContext = createContext<Ctx>({ state: initialActionState, pending: false });

export function useFormState() {
  return useContext(FormStateContext);
}

type ActionFormProps = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** Hide the success/error banner (e.g. compact row actions show it inline instead). */
  compact?: boolean;
  encType?: "multipart/form-data";
};

/**
 * Wraps a server action with pending state, a result banner and per-field errors.
 * Submits via a transition so a failed validation keeps everything the user typed.
 */
export function ActionForm({ action, children, className, resetOnSuccess, compact, encType }: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <FormStateContext.Provider value={{ state, pending }}>
      <form
        ref={ref}
        action={formAction}
        encType={encType}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
          const fd = new FormData(e.currentTarget, submitter);
          startTransition(() => formAction(fd));
        }}
        className={className}
      >
        {!compact && state.message && <FormAlert ok={state.ok} message={state.message} />}
        {children}
        {compact && state.message && (
          <span className={cn("text-xs font-medium", state.ok ? "text-emerald-700" : "text-red-700")}>{state.message}</span>
        )}
      </form>
    </FormStateContext.Provider>
  );
}

export function FormAlert({ ok, message }: { ok: boolean; message: string }) {
  return (
    <div
      role={ok ? "status" : "alert"}
      className={cn(
        "mb-4 flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800",
      )}
    >
      {ok ? <CircleCheck className="mt-0.5 size-4 shrink-0" /> : <CircleAlert className="mt-0.5 size-4 shrink-0" />}
      <span className="whitespace-pre-line">{message}</span>
    </div>
  );
}

export function FieldError({ name }: { name: string }) {
  const { state } = useFormState();
  const errors = state.errors?.[name];
  if (!errors?.length) return null;
  return <p className="text-xs font-medium text-red-600">{errors[0]}</p>;
}

export function SubmitButton({
  children,
  variant,
  size,
  className,
  name,
  value,
  confirm,
  pendingText,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  name?: string;
  value?: string;
  /** Ask for confirmation before submitting. */
  confirm?: string;
  pendingText?: string;
}) {
  const { pending } = useFormState();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={buttonClasses(variant, size, className)}
    >
      {pending && <LoaderCircle className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

/** Shows text returned in `state.data[key]` after a successful submission. */
export function ResultData({ dataKey, render }: { dataKey: string; render: (value: string) => ReactNode }) {
  const { state } = useFormState();
  const value = state.data?.[dataKey];
  return value ? <>{render(value)}</> : null;
}
