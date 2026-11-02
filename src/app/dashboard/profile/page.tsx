import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStudent } from "@/lib/auth/guards";
import { label } from "@/lib/constants";
import { ageOn, formatDate, formatDateTime } from "@/lib/format";
import { appUrl } from "@/lib/request";
import { changePasswordAction } from "@/actions/auth";
import { PageHeader, DescriptionList } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";
import { CopyButton, ShareButtons } from "@/components/ui/client-widgets";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "My profile" };

export default async function ProfilePage() {
  const { user: s } = await requireStudent();
  const user = await db.user.findUniqueOrThrow({
    where: { id: s.id },
    include: { profile: true, _count: { select: { referralsMade: true } }, referralsMade: { where: { status: "CONVERTED" }, select: { id: true } } },
  });
  const minor = user.profile ? ageOn(user.profile.dateOfBirth) < 18 : false;
  const referralLink = appUrl(`/register?ref=${user.referralCode}`);

  return (
    <div className="space-y-6">
      <PageHeader title="My profile" description="Keep your details accurate — prize winners must match their registered details." />
      {!user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader title="Personal & school details" />
          <CardBody>
            <ProfileForm
              defaults={{
                fullName: user.fullName,
                phone: user.phone,
                city: user.profile?.city ?? "",
                district: user.profile?.district ?? "",
                institution: user.profile?.institution ?? "",
                classLevel: user.profile?.classLevel ?? "",
                dateOfBirth: user.profile ? user.profile.dateOfBirth.toISOString().slice(0, 10) : "",
                guardianName: user.profile?.guardianName ?? "",
                guardianPhone: user.profile?.guardianPhone ?? "",
                guardianRelation: user.profile?.guardianRelation ?? "",
                guardianConsent: !!user.profile?.guardianConsentAt,
                leaderboardNameMode: user.profile?.leaderboardNameMode ?? "INITIALS",
                mediaConsent: user.profile?.mediaConsent ?? false,
              }}
            />
          </CardBody>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Account status" />
            <CardBody>
              <DescriptionList
                className="sm:grid-cols-1"
                items={[
                  { label: "Email", value: user.email },
                  { label: "Account", value: <StatusBadge status={user.status} /> },
                  { label: "Email verification", value: user.emailVerifiedAt ? <Badge tone="green">Verified {formatDate(user.emailVerifiedAt)}</Badge> : <Badge tone="amber">Not verified</Badge> },
                  {
                    label: "Guardian consent",
                    value: !minor ? "Not required (18+)" : user.profile?.guardianConsentAt ? (
                      <span>
                        Recorded {formatDate(user.profile.guardianConsentAt)}
                        {user.profile.guardianConsentVerified && <Badge tone="green" className="ml-2">Verified by staff</Badge>}
                      </span>
                    ) : (
                      <Badge tone="red">Missing</Badge>
                    ),
                  },
                  { label: "Leaderboard name", value: label(user.profile?.leaderboardNameMode) },
                  { label: "Member since", value: formatDate(user.createdAt) },
                  { label: "Last login", value: formatDateTime(user.lastLoginAt) },
                ]}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Invite friends" description="Share your referral link. We'll count friends who register and pay." />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between gap-3 rounded-xl bg-navy-50 px-4 py-3">
                <span className="font-mono text-lg font-bold tracking-widest">{user.referralCode}</span>
                <CopyButton value={referralLink} label="Copy link" />
              </div>
              <p className="text-sm text-navy-600">
                {user._count.referralsMade} friend(s) signed up · {user.referralsMade.length} registered and paid
              </p>
              <ShareButtons url={referralLink} text="Join me on Rewarding Potential — online academic competitions for Sindh students with laptop and Chromebook prizes!" />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Change password" description="You'll stay signed in here and be signed out elsewhere." />
            <CardBody>
              <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4">
                <Field label="Current password" name="currentPassword">
                  <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
                </Field>
                <Field label="New password" name="newPassword" hint="At least 8 characters with a letter and a number">
                  <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
                </Field>
                <Field label="Confirm new password" name="confirmPassword">
                  <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
                </Field>
                <SubmitButton variant="navy">Change password</SubmitButton>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
