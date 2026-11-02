import type { Metadata } from "next";
import Link from "next/link";
import { resetPasswordAction } from "@/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";
import { Alert } from "@/components/ui/layout";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="w-full max-w-md rounded-3xl border border-navy-100 bg-white p-7 shadow-card sm:p-9">
      <h1 className="text-2xl font-bold">Choose a new password</h1>
      {!token ? (
        <Alert tone="error" className="mt-5">
          This link is incomplete. <Link href="/forgot-password" className="font-semibold underline">Request a new reset link</Link>.
        </Alert>
      ) : (
        <ActionForm action={resetPasswordAction} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <Field label="New password" name="password" hint="At least 8 characters with a letter and a number">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
          </Field>
          <Field label="Confirm new password" name="confirmPassword">
            <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          </Field>
          <SubmitButton size="lg" className="w-full">
            Save new password
          </SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
