"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "./logo";

type Props = {
  items: { href: string; label: string }[];
  account: { name: string; href: string; label: string } | null;
};

export function NavbarClient({ items, account }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b bg-white/90 backdrop-blur-md transition-shadow",
        scrolled ? "border-navy-100 shadow-[0_6px_24px_-12px_rgb(10_20_45/0.18)]" : "border-transparent",
      )}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 xl:flex" aria-label="Main">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
                active(it.href) ? "text-brand-700" : "text-navy-600 hover:text-navy-950",
              )}
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          {account ? (
            <Link href={account.href} className={buttonClasses("navy", "md")}>
              <LayoutDashboard className="size-4" /> {account.label}
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClasses("ghost", "md")}>
                Log in
              </Link>
              <Link href="/register" className={buttonClasses("primary", "md")}>
                Register now
              </Link>
            </>
          )}
        </div>
        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-navy-800 ring-1 ring-navy-200 xl:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-navy-100 bg-white xl:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {items.map((it) => (
              <Link
                key={it.href}
                href={it.href}
                className={cn("rounded-lg px-3 py-3 text-[15px] font-semibold", active(it.href) ? "bg-brand-50 text-brand-700" : "text-navy-800")}
              >
                {it.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-navy-100 pt-4">
              {account ? (
                <Link href={account.href} className={buttonClasses("navy", "lg", "col-span-2")}>
                  {account.label}
                </Link>
              ) : (
                <>
                  <Link href="/login" className={buttonClasses("secondary", "lg")}>
                    Log in
                  </Link>
                  <Link href="/register" className={buttonClasses("primary", "lg")}>
                    Register
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
