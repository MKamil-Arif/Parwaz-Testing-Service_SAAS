import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { CircleCheck, CircleX } from "lucide-react";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { getCompetitionBySlug, prizeCount } from "@/lib/queries";
import { checkEligibility } from "@/lib/competition-rules";
import { classLabel, REGISTRATION_STATUS } from "@/lib/constants";
import { ageOn, formatDate, formatDateTime, formatPKR, num } from "@/lib/format";
import { registerForCompetitionAction } from "@/actions/student";
import { PageHeader, Alert, DescriptionList } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField } from "@/components/ui/form";
import { Prose } from "@/components/ui/prose";
import { buttonClasses } from "@/components/ui/button";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";

export const metadata: Metadata = { title: "Register for competition" };

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-3">
            <span className="grid size-7 place-items-center rounded-lg bg-navy-950 text-xs font-bold text-gold-300">{n}</span>
            {title}
          </span>
        }
      />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export default async function RegisterWizardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { user: sessionUser } = await requireStudent(`/dashboard/competitions/${slug}/register`);
  const c = await getCompetitionBySlug(slug);
  if (!c) notFound();

  const user = await db.user.findUniqueOrThrow({ where: { id: sessionUser.id }, include: { profile: true } });
  const existing = await db.competitionRegistration.findUnique({ where: { userId_competitionId: { userId: user.id, competitionId: c.id } } });
  if (existing && existing.status !== REGISTRATION_STATUS.CANCELLED) redirect(`/dashboard/registrations/${existing.id}/pay`);

  const fee = num(c.registrationFee);
  const checks = user.profile ? checkEligibility({ ...c, eligibleClasses: c.eligibleClasses.map((e) => e.classLevel) }, user.profile) : [];
  const minor = user.profile ? ageOn(user.profile.dateOfBirth) < 18 : false;
  const consentMissing = minor && !user.profile?.guardianConsentAt;
  const eligible = !!user.profile && checks.every((ch) => ch.ok) && !consentMissing;
  const open = c.phase === "REGISTRATION_OPEN";

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={`Register: ${c.title}`} back={{ href: "/dashboard/competitions", label: "Competitions" }} />
      {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
      {!open && (
        <Alert tone="warning" title="Registration is not open" className="mb-6">
          This competition is not accepting registrations right now.
        </Alert>
      )}

      <div className="space-y-5">
        <Step n={1} title="Review the competition">
          <DescriptionList
            items={[
              { label: "Registration fee", value: fee ? formatPKR(fee) : "Free" },
              { label: "Registration closes", value: formatDateTime(c.registrationClosesAt) },
              { label: "Exam window", value: `${formatDateTime(c.examStartsAt)} – ${formatDateTime(c.examEndsAt)}` },
              { label: "Format", value: `${c.questionCount} MCQs · ${c.durationMinutes} minutes` },
              { label: "Prizes", value: c.prizes.length ? c.prizes.map((p) => `Ranks ${p.rankFrom}–${p.rankTo}: ${p.title}`).join("; ") : "—" },
              { label: "Total devices", value: c.prizes.length ? prizeCount(c.prizes) : "—" },
            ]}
          />
          <Link href={`/competitions/${c.slug}`} target="_blank" className="mt-4 inline-block text-sm font-semibold text-brand-700">
            Open full competition page ↗
          </Link>
        </Step>

        <Step n={2} title="Confirm your eligibility">
          {!user.profile ? (
            <Alert tone="warning">
              Complete <Link href="/dashboard/profile" className="font-semibold underline">your profile</Link> first.
            </Alert>
          ) : (
            <>
              <DescriptionList
                className="mb-5"
                items={[
                  { label: "Name", value: user.fullName },
                  { label: "Date of birth", value: formatDate(user.profile.dateOfBirth) },
                  { label: "Class", value: classLabel(user.profile.classLevel) },
                  { label: "School / college", value: user.profile.institution },
                  { label: "District", value: user.profile.district },
                  { label: "Mobile", value: user.phone },
                ]}
              />
              <ul className="space-y-2">
                {checks.map((ch) => (
                  <li key={ch.label} className="flex items-start gap-2.5 text-sm">
                    {ch.ok ? <CircleCheck className="mt-0.5 size-4 text-emerald-600" /> : <CircleX className="mt-0.5 size-4 text-red-600" />}
                    <span>
                      <span className="font-semibold">{ch.label}:</span> {ch.detail}
                    </span>
                  </li>
                ))}
                {minor && (
                  <li className="flex items-start gap-2.5 text-sm">
                    {consentMissing ? <CircleX className="mt-0.5 size-4 text-red-600" /> : <CircleCheck className="mt-0.5 size-4 text-emerald-600" />}
                    <span>
                      <span className="font-semibold">Parent/guardian consent:</span>{" "}
                      {consentMissing ? (
                        <Link href="/dashboard/profile" className="underline">
                          Required — add it in your profile
                        </Link>
                      ) : (
                        `Recorded (${user.profile.guardianName})`
                      )}
                    </span>
                  </li>
                )}
              </ul>
              <p className="mt-4 text-xs text-navy-500">
                Wrong details? <Link href="/dashboard/profile" className="font-semibold text-brand-700">Update your profile</Link> before registering —
                prize winners must match these details.
              </p>
            </>
          )}
        </Step>

        <Step n={3} title="Accept the competition rules">
          <div className="max-h-72 overflow-y-auto rounded-xl border border-navy-100 bg-navy-50/50 p-4">
            <Prose className="text-sm">{c.rules}</Prose>
            <h3 className="mt-6 mb-2 text-sm font-bold">Tie-breaking rules</h3>
            <Prose className="text-sm">{c.tieBreakPolicy}</Prose>
          </div>
        </Step>

        <Step n={4} title={fee ? "Confirm and proceed to payment" : "Confirm registration"}>
          {eligible && open && user.emailVerifiedAt ? (
            <ActionForm action={registerForCompetitionAction} className="space-y-4">
              <input type="hidden" name="competitionId" value={c.id} />
              <CheckboxField name="confirmDetails" required label="My personal and school details above are correct and belong to me." />
              <CheckboxField name="confirmEligibility" required label="I confirm that I meet the eligibility criteria for this competition." />
              <CheckboxField
                name="acceptRules"
                required
                label="I have read and accept the competition rules, tie-breaking rules, Terms and Conditions and Refund Policy."
              />
              <SubmitButton size="lg" variant="primary" pendingText="Creating registration…">
                {fee ? `Continue to payment (${formatPKR(fee)})` : "Confirm registration"}
              </SubmitButton>
            </ActionForm>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-navy-600">
                {!user.emailVerifiedAt
                  ? "Verify your email address to continue."
                  : !open
                    ? "Registration is closed."
                    : "You can't register yet — please resolve the items marked above."}
              </p>
              <Link href="/dashboard/profile" className={buttonClasses("secondary", "md")}>
                Go to my profile
              </Link>
            </div>
          )}
        </Step>
      </div>
    </div>
  );
}
