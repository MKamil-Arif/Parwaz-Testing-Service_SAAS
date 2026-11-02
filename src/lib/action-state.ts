import type { z } from "zod";

/** Shape returned by every form server action (consumed by <ActionForm>). */
export type ActionState = {
  ok: boolean;
  message?: string;
  errors?: Record<string, string[]>;
  /** Extra data a form may want to display after success (e.g. a dev-only link). */
  data?: Record<string, string>;
};

export const initialActionState: ActionState = { ok: false };

export function fail(message: string, errors?: Record<string, string[]>): ActionState {
  return { ok: false, message, errors };
}

export function success(message: string, data?: Record<string, string>): ActionState {
  return { ok: true, message, data };
}

export function zodErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? String(issue.path[0]) : "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** FormData → plain object. Keys listed in `multi` are collected as arrays (checkbox groups). */
export function formToObject(fd: FormData, multi: string[] = []): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const key of new Set(fd.keys())) {
    if (key.startsWith("$ACTION")) continue;
    if (multi.includes(key)) obj[key] = fd.getAll(key).map(String);
    else {
      const v = fd.get(key);
      obj[key] = typeof v === "string" ? v : v;
    }
  }
  for (const key of multi) obj[key] ??= [];
  return obj;
}

type ParseResult<T> = { ok: true; data: T } | { ok: false; state: ActionState };

export function parseForm<S extends z.ZodType>(schema: S, fd: FormData, multi: string[] = []): ParseResult<z.infer<S>> {
  const result = schema.safeParse(formToObject(fd, multi));
  if (!result.success) {
    return { ok: false, state: fail("Please correct the highlighted fields.", zodErrors(result.error)) };
  }
  return { ok: true, data: result.data };
}
