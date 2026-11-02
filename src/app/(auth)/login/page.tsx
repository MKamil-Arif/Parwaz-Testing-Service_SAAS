import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/actions/auth";
import { getCurrentUser } from "@/lib/auth/guards";
import { isStaff } from "@/lib/auth/permissions";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const { next, reset } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(isStaff(user.roles) ? "/admin" : "/dashboard");

  return (
    <div className="w-full max-w-md rounded-3xl border border-navy-100 bg-white p-7 shadow-card sm:p-9">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mt-1 text-sm text-navy-500">Log in to your Rewarding Potential account.</p>
      {reset && (
        <Alert tone="success" className="mt-5">
          Your password has been reset. Please log in with your new password.
        </Alert>
      )}
      <ActionForm action={loginAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Email address" name="email">
          <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Password" name="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm font-semibold text-brand-700 hover:underline">
            Forgot password?
          </Link>
        </div>
        <SubmitButton size="lg" className="w-full" pendingText="Logging in…">
          Log in
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-navy-600">
        New to Rewarding Potential?{" "}
        <Link href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"} className="font-semibold text-brand-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
