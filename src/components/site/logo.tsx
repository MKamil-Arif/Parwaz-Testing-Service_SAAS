import Link from "next/link";
import { cn } from "@/lib/cn";

/** Brand mark: a shield (trust, verified testing) with a rising gold chevron (potential). */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="rp-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#284ddc" />
          <stop offset="1" stopColor="#122042" />
        </linearGradient>
        <linearGradient id="rp-gold" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#c49530" />
          <stop offset="1" stopColor="#efdb98" />
        </linearGradient>
      </defs>
      <path d="M20 2.5 34.5 8v11.2c0 9.1-6.1 15.9-14.5 18.3C11.6 35.1 5.5 28.3 5.5 19.2V8L20 2.5z" fill="url(#rp-shield)" />
      <path d="M11.5 25.5 20 14.5l8.5 11" fill="none" stroke="url(#rp-gold)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="20" cy="9.6" r="2.1" fill="#e4c463" />
    </svg>
  );
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="Rewarding Potential home">
      <LogoMark className="size-9 shrink-0 transition-transform group-hover:-translate-y-0.5" />
      <span className="leading-none">
        <span className={cn("block font-display text-[17px] font-extrabold tracking-tight", light ? "text-white" : "text-navy-950")}>
          Rewarding Potential
        </span>
        <span className={cn("mt-1 block text-[10.5px] font-semibold tracking-[0.12em] uppercase", light ? "text-gold-300" : "text-gold-600")}>
          Online Academic Testing
        </span>
      </span>
    </Link>
  );
}
