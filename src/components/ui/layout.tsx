import Link from "next/link";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ChevronLeft, ChevronRight, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back && (
        <Link href={back.href} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-navy-500 hover:text-navy-900">
          <ChevronLeft className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-navy-950 sm:text-[28px]">{title}</h1>
          {description && <p className="mt-1 max-w-3xl text-sm text-navy-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  tone?: "blue" | "gold" | "green" | "navy" | "amber" | "violet";
}) {
  const toneClass = {
    blue: "bg-brand-50 text-brand-700",
    gold: "bg-gold-50 text-gold-700",
    green: "bg-emerald-50 text-emerald-700",
    navy: "bg-navy-100 text-navy-800",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  }[tone];
  return (
    <div className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-navy-500">{label}</p>
        {Icon && (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", toneClass)}>
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-[26px] leading-tight font-bold text-navy-950 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-navy-500">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && (
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-navy-50 text-navy-400">
          <Icon className="size-6" />
        </span>
      )}
      <p className="font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-sm text-navy-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "success" | "warning" | "error";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const conf = {
    info: { cls: "border-brand-200 bg-brand-50 text-brand-900", Icon: Info },
    success: { cls: "border-emerald-200 bg-emerald-50 text-emerald-900", Icon: CircleCheck },
    warning: { cls: "border-amber-200 bg-amber-50 text-amber-900", Icon: TriangleAlert },
    error: { cls: "border-red-200 bg-red-50 text-red-900", Icon: CircleAlert },
  }[tone];
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", conf.cls, className)}>
      <conf.Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

// ─── Tables ───

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-navy-100 bg-navy-50/60 text-xs font-semibold tracking-wide text-navy-500 uppercase">
      {children}
    </thead>
  );
}
export function TH({ children, className }: { children?: ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-semibold whitespace-nowrap", className)}>{children}</th>;
}
export function TR({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-b border-navy-100 last:border-0 hover:bg-navy-50/40", className)}>{children}</tr>;
}
export function TD({ children, className, colSpan }: { children?: ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-4 py-3 align-middle text-navy-700", className)}>
      {children}
    </td>
  );
}

// ─── Pagination & tabs (link based, work without JavaScript) ───

export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="px-4 py-3 text-xs text-navy-500">{total} record{total === 1 ? "" : "s"}</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };
  return (
    <div className="flex items-center justify-between gap-3 border-t border-navy-100 px-4 py-3 text-sm">
      <p className="text-xs text-navy-500">
        Page {page} of {pages} · {total} records
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50">
            <ChevronLeft className="size-4" /> Prev
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium text-navy-700 ring-1 ring-navy-200 hover:bg-navy-50">
            Next <ChevronRight className="size-4" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function LinkTabs({ tabs }: { tabs: { href: string; label: ReactNode; active: boolean }[] }) {
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto border-b border-navy-100">
      {tabs.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={cn(
            "-mb-px border-b-2 px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
            t.active ? "border-brand-600 text-brand-700" : "border-transparent text-navy-500 hover:text-navy-900",
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}

export function DescriptionList({ items, className }: { items: { label: ReactNode; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3 sm:grid-cols-2", className)}>
      {items.map((it, i) => (
        <div key={i} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-navy-500 uppercase">{it.label}</dt>
          <dd className="mt-0.5 text-sm break-words text-navy-900">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  light,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  light?: boolean;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
      {eyebrow && (
        <p className={cn("mb-3 text-xs font-bold tracking-[0.16em] uppercase", light ? "text-gold-300" : "text-gold-600")}>{eyebrow}</p>
      )}
      <h2 className={cn("text-3xl font-bold text-balance sm:text-[38px] sm:leading-[1.15]", light && "text-white")}>{title}</h2>
      {description && <p className={cn("mt-4 text-base leading-relaxed", light ? "text-navy-200" : "text-navy-600")}>{description}</p>}
    </div>
  );
}
