import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/guards";
import { label } from "@/lib/constants";
import { changePasswordAction } from "@/actions/auth";
import { PageHeader, DescriptionList } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";

export const metadata: Metadata = { title: "My account" };

export default async function AdminAccountPage() {
  const { user } = await requireStaff();
  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="My account" />
      <Card>
        <CardBody>
          <DescriptionList
            items={[
              { label: "Name", value: user.fullName },
              { label: "Email", value: user.email },
              { label: "Roles", value: user.roles.map(label).join(", ") },
            ]}
          />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Change password" description="Use a long, unique password. Other sessions are signed out." />
        <CardBody>
          <ActionForm action={changePasswordAction} resetOnSuccess className="space-y-4">
            <Field label="Current password" name="currentPassword">
              <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" name="newPassword" hint="At least 8 characters with a letter and a number (12+ recommended for staff)">
              <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required minLength={8} />
            </Field>
            <Field label="Confirm new password" name="confirmPassword">
              <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
            </Field>
            <SubmitButton>Change password</SubmitButton>
          </ActionForm>
        </CardBody>
      </Card>
    </div>
  );
}
