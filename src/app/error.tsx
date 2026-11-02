"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-[70dvh] place-items-center px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-navy-600">
          The request could not be completed. Please try again. If the problem continues, contact support
          {error.digest ? ` and quote reference ${error.digest}` : ""}.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button type="button" onClick={reset} className={buttonClasses("primary", "md")}>
            Try again
          </button>
          <Link href="/" className={buttonClasses("secondary", "md")}>
            Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
