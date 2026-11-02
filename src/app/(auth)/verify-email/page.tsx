import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, CircleX } from "lucide-react";
import { verifyEmailToken } from "@/actions/auth";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Verify email" };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const ok = token ? await verifyEmailToken(token) : false;
  return (
    <div className="w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 text-center shadow-card">
      {ok ? <CircleCheck className="mx-auto size-12 text-emerald-600" /> : <CircleX className="mx-auto size-12 text-red-500" />}
      <h1 className="mt-4 text-2xl font-bold">{ok ? "Email verified" : "Link invalid or expired"}</h1>
      <p className="mt-2 text-sm text-navy-600">
        {ok
          ? "Thank you! You can now register for competitions."
          : "This verification link has already been used or has expired. Log in and request a new link from your dashboard."}
      </p>
      <Link href="/dashboard" className={buttonClasses("primary", "lg", "mt-6 w-full")}>
        Go to my dashboard
      </Link>
    </div>
  );
}
