import Link from "next/link";
import { BadgeCheck, ShieldCheck, Trophy } from "lucide-react";
import { Logo } from "@/components/site/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="relative hidden overflow-hidden bg-navy-950 bg-grid-dark p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden="true" className="absolute -top-24 -right-24 size-96 rounded-full bg-brand-600/35 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-32 -left-20 size-80 rounded-full bg-gold-500/15 blur-3xl" />
        <Logo light className="relative" />
        <div className="relative my-auto max-w-md">
          <h2 className="text-4xl leading-tight font-extrabold text-white">
            Test Your Knowledge, <span className="text-gold-300">Earn Your Future.</span>
          </h2>
          <ul className="mt-10 space-y-5">
            {[
              { Icon: ShieldCheck, t: "Secure, server-timed online exams", d: "Answers save automatically — even on a weak connection." },
              { Icon: BadgeCheck, t: "Verified, transparent results", d: "Published tie-break rules and admin-approved merit lists." },
              { Icon: Trophy, t: "Real rewards", d: "Laptops and Chromebooks for the top performers." },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/5 text-gold-300 ring-1 ring-white/10">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="font-semibold">{t}</p>
                  <p className="text-sm text-navy-300">{d}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-navy-400">
          © {new Date().getFullYear()} Parwaz Testing Service ·{" "}
          <Link href="/privacy-policy" className="hover:text-white">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
        </p>
      </aside>
      <main className="flex flex-col bg-surface">
        <div className="flex items-center justify-between px-5 py-5 sm:px-8 lg:justify-end">
          <Logo className="lg:hidden" />
          <Link href="/" className="text-sm font-semibold text-navy-600 hover:text-navy-950">
            ← Back to website
          </Link>
        </div>
        <div className="flex flex-1 items-start justify-center px-4 pb-16 sm:items-center">{children}</div>
      </main>
    </div>
  );
}
