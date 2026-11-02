import Link from "next/link";
import { LogoMark } from "@/components/site/logo";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-navy-950 bg-grid-dark px-4 text-center text-white">
      <div>
        <LogoMark className="mx-auto size-14" />
        <p className="mt-6 font-display text-6xl font-extrabold text-gold-300">404</p>
        <h1 className="mt-2 text-2xl font-bold text-white">This page could not be found</h1>
        <p className="mt-2 text-navy-300">The link may be broken, or the page may have moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonClasses("gold", "lg")}>
            Go to homepage
          </Link>
          <Link href="/competitions" className={buttonClasses("light", "lg")}>
            Competitions
          </Link>
        </div>
      </div>
    </main>
  );
}
