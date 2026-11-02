"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Bell, LogOut, Menu, X } from "lucide-react";
import * as Icons from "./icons";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/cn";

export type NavItem = { href: string; label: string; icon: keyof typeof Icons; badge?: number; exact?: boolean };
export type NavGroup = { title?: string; items: NavItem[] };

type Props = {
  area: "student" | "admin";
  groups: NavGroup[];
  user: { name: string; email: string; roleLabel: string };
  notificationsHref?: string;
  unread?: number;
  logout: () => Promise<void>;
  children: ReactNode;
};

export function AppShell({ area, groups, user, notificationsHref, unread = 0, logout, children }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (item: NavItem) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`));
  const dark = area === "admin";

  const sidebar = (
    <div className={cn("flex h-full flex-col", dark ? "bg-navy-950 text-navy-200" : "bg-white")}>
      <div className={cn("flex h-16 items-center px-5", dark ? "border-b border-white/10" : "border-b border-navy-100")}>
        <Logo light={dark} />
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && (
              <p className={cn("mb-2 px-3 text-[11px] font-bold tracking-[0.14em] uppercase", dark ? "text-navy-500" : "text-navy-400")}>
                {g.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = Icons[item.icon];
                const active = isActive(item);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors",
                        dark
                          ? active
                            ? "bg-white/10 text-white"
                            : "text-navy-300 hover:bg-white/5 hover:text-white"
                          : active
                            ? "bg-brand-50 text-brand-700"
                            : "text-navy-600 hover:bg-navy-50 hover:text-navy-950",
                      )}
                    >
                      <Icon className={cn("size-[18px] shrink-0", active && (dark ? "text-gold-300" : "text-brand-600"))} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {!!item.badge && (
                        <span className="rounded-full bg-gold-400 px-1.5 py-0.5 text-[10px] leading-none font-bold text-navy-950">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className={cn("p-3", dark ? "border-t border-white/10" : "border-t border-navy-100")}>
        <form action={logout}>
          <button
            type="submit"
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold",
              dark ? "text-navy-300 hover:bg-white/5 hover:text-white" : "text-navy-600 hover:bg-navy-50",
            )}
          >
            <LogOut className="size-[18px]" /> Log out
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface">
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden w-64 lg:block", !dark && "border-r border-navy-100")}>{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-navy-950/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] shadow-lift">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-navy-100 bg-white/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            className="grid size-10 place-items-center rounded-lg text-navy-700 ring-1 ring-navy-200 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <p className="hidden text-sm font-semibold text-navy-500 sm:block">{area === "admin" ? "Administration" : "Student portal"}</p>
          <div className="ml-auto flex items-center gap-3">
            {notificationsHref && (
              <Link
                href={notificationsHref}
                className="relative grid size-10 place-items-center rounded-xl text-navy-600 ring-1 ring-navy-200 hover:bg-navy-50"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
              >
                <Bell className="size-[18px]" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 grid min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            )}
            <div className="flex items-center gap-2.5">
              <span className="grid size-10 place-items-center rounded-xl bg-navy-900 font-display text-sm font-bold text-gold-300">
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </span>
              <div className="hidden leading-tight sm:block">
                <p className="max-w-[180px] truncate text-sm font-semibold text-navy-950">{user.name}</p>
                <p className="text-xs text-navy-500">{user.roleLabel}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
