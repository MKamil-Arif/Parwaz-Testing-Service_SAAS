import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
  navy: "bg-navy-900 text-white shadow-sm hover:bg-navy-800",
  gold: "bg-gold-400 text-navy-950 shadow-sm hover:bg-gold-300",
  secondary: "bg-white text-navy-800 ring-1 ring-inset ring-navy-200 hover:bg-navy-50 hover:ring-navy-300",
  ghost: "text-navy-700 hover:bg-navy-50",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  "danger-soft": "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200 hover:bg-red-100",
  light: "text-white ring-1 ring-inset ring-white/30 hover:bg-white/10",
} as const;

const sizes = {
  xs: "h-7 px-2.5 text-xs gap-1 rounded-lg",
  sm: "h-9 px-3.5 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-[15px] gap-2 rounded-xl",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-55",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize };

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
  target?: string;
};

export function ButtonLink({ href, variant, size, className, children, prefetch, target }: ButtonLinkProps) {
  return (
    <Link href={href} prefetch={prefetch} target={target} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
