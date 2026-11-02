import type { Metadata } from "next";
import Link from "next/link";
import { forgotPasswordAction } from "@/actions/auth";
import { ActionForm, ResultData, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";
import { DevLink } from "@/components/ui/dev-link";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md rounded-3xl border border-navy-100 bg-white p-7 shadow-card sm:p-9">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      <p className="mt-1 text-sm text-navy-500">Enter your account email and we'll send you a link to choose a new password.</p>
      <ActionForm action={forgotPasswordAction} className="mt-6 space-y-4">
        <Field label="Email address" name="email">
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton size="lg" className="w-full">
          Send reset link
        </SubmitButton>
        <ResultData dataKey="devLink" render={(v) => <DevLink href={v} label="Open password reset link" />} />
      </ActionForm>
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-brand-700 hover:underline">
          ← Back to log in
        </Link>
      </p>
    </div>
  );
}
