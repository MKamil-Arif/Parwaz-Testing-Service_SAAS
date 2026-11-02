import { MailWarning } from "lucide-react";
import { resendVerificationAction } from "@/actions/auth";
import { ActionForm, ResultData, SubmitButton } from "@/components/ui/form-client";
import { DevLink } from "@/components/ui/dev-link";

export function VerifyEmailBanner({ email }: { email: string }) {
  return (
    <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
      <div className="flex flex-wrap items-start gap-4">
        <MailWarning className="mt-0.5 size-5 shrink-0 text-amber-700" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-900">Please verify your email address</p>
          <p className="mt-0.5 text-sm text-amber-800">
            We sent a verification link to <strong>{email}</strong>. You need a verified email to register for competitions.
          </p>
        </div>
        <ActionForm action={resendVerificationAction} className="w-full space-y-3 sm:w-auto">
          <SubmitButton variant="secondary" size="sm">
            Resend verification email
          </SubmitButton>
          <ResultData dataKey="devLink" render={(v) => <DevLink href={v} label="Open verification link" />} />
        </ActionForm>
      </div>
    </div>
  );
}
