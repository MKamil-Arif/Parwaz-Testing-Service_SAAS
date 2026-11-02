import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { label } from "@/lib/constants";

const tones = {
  neutral: "bg-navy-50 text-navy-700 ring-navy-200",
  blue: "bg-brand-50 text-brand-700 ring-brand-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-800 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  gold: "bg-gold-50 text-gold-700 ring-gold-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  dark: "bg-navy-900 text-white ring-navy-900",
} as const;
export type Tone = keyof typeof tones;

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  ACTIVE: "green",
  PUBLISHED: "green",
  CONFIRMED: "green",
  SUCCEEDED: "green",
  VERIFIED: "green",
  DELIVERED: "green",
  RESOLVED: "green",
  CONVERTED: "green",
  SENT: "green",
  APPROVED: "blue",
  SUBMITTED: "blue",
  AUTO_SUBMITTED: "blue",
  IN_PROGRESS: "blue",
  SCHEDULED: "blue",
  DISPATCHED: "blue",
  PROVISIONAL: "blue",
  OPEN: "blue",
  PENDING_PAYMENT: "amber",
  PENDING_VERIFICATION: "amber",
  PENDING_REVIEW: "amber",
  INITIATED: "amber",
  PENDING: "amber",
  REQUESTED: "amber",
  PLANNED: "amber",
  DRAFT: "neutral",
  ARCHIVED: "neutral",
  CLOSED: "neutral",
  PAUSED: "neutral",
  COMPLETED: "neutral",
  LOGGED: "neutral",
  EXPIRED: "neutral",
  SIGNED_UP: "neutral",
  CANCELLED: "red",
  FAILED: "red",
  SUSPENDED: "red",
  REJECTED: "red",
  DISQUALIFIED: "red",
  VOIDED: "red",
  FORFEITED: "red",
  WITHHELD: "violet",
  REFUNDED: "violet",
};

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return null;
  return (
    <Badge tone={STATUS_TONES[status] ?? "neutral"} className={className}>
      {label(status)}
    </Badge>
  );
}

export function SampleBadge({ children = "Sample" }: { children?: ReactNode }) {
  return (
    <Badge tone="gold" className="uppercase tracking-wide">
      {children}
    </Badge>
  );
}
