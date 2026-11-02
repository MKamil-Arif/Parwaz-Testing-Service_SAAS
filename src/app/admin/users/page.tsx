import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { STAFF_ROLES, USER_STATUS, label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { createStaffAction, setStaffRolesAction, setStaffStatusAction } from "@/actions/admin/users";
import { PageHeader, Table, THead, TH, TR, TD } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, ResultData, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";
import { DevLink } from "@/components/ui/dev-link";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin users & roles" };

export default async function AdminUsersPage() {
  const session = await requireStaff("users.manage");
  const staff = await db.user.findMany({
    where: { roles: { some: { role: { name: { in: STAFF_ROLES } } } } },
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "asc" },
  });
  return (
    <div className="space-y-6">
      <PageHeader title="Admin users & roles" description="Role-based access: each staff member sees only the modules their roles allow. Role changes sign the user out." />
      <Card className="overflow-hidden">
        <Table>
          <THead>
            <tr>
              <TH>Staff member</TH>
              <TH>Roles</TH>
              <TH>Last login</TH>
              <TH>Status</TH>
            </tr>
          </THead>
          <tbody>
            {staff.map((u) => {
              const roles = u.roles.map((r) => r.role.name);
              return (
                <TR key={u.id}>
                  <TD>
                    <p className="font-semibold text-navy-950">{u.fullName}</p>
                    <p className="text-xs text-navy-500">{u.email}</p>
                  </TD>
                  <TD>
                    <ActionForm action={setStaffRolesAction} compact className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="userId" value={u.id} />
                      {STAFF_ROLES.map((r) => (
                        <label key={r} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" name="roles" value={r} defaultChecked={roles.includes(r)} className="size-3.5 accent-brand-600" />
                          {label(r)}
                        </label>
                      ))}
                      <SubmitButton size="xs" variant="secondary">Save roles</SubmitButton>
                    </ActionForm>
                  </TD>
                  <TD className="text-xs">{formatDateTime(u.lastLoginAt)}</TD>
                  <TD>
                    <StatusBadge status={u.status} />
                    {u.id !== session.user.id && (
                      <form action={setStaffStatusAction.bind(null, u.id, u.status === USER_STATUS.ACTIVE ? USER_STATUS.SUSPENDED : USER_STATUS.ACTIVE)} className="mt-1">
                        <button type="submit" className="text-xs font-semibold text-navy-600 hover:text-navy-950">
                          {u.status === USER_STATUS.ACTIVE ? "Suspend" : "Reactivate"}
                        </button>
                      </form>
                    )}
                  </TD>
                </TR>
              );
            })}
          </tbody>
        </Table>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Add staff member" description="They receive a one-time link to set their own password." />
          <CardBody>
            <ActionForm action={createStaffAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" name="fullName">
                <Input id="fullName" name="fullName" required />
              </Field>
              <Field label="Email" name="email">
                <Input id="email" name="email" type="email" required />
              </Field>
              <Field label="Mobile" name="phone">
                <Input id="phone" name="phone" required />
              </Field>
              <div className="space-y-1 sm:col-span-2">
                <p className="text-sm font-medium text-navy-800">Roles</p>
                <div className="flex flex-wrap gap-3">
                  {STAFF_ROLES.map((r) => (
                    <label key={r} className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" name="roles" value={r} className="size-4 accent-brand-600" /> {label(r)}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3 sm:col-span-2">
                <SubmitButton>Create staff account</SubmitButton>
                <ResultData dataKey="devLink" render={(v) => <DevLink href={v} label="Set-password link for the new staff member" />} />
              </div>
            </ActionForm>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="What each role can do" />
          <CardBody>
            <ul className="space-y-1.5 text-xs">
              {Object.entries(PERMISSIONS).map(([perm, roles]) => (
                <li key={perm} className="flex justify-between gap-4 border-b border-navy-50 pb-1">
                  <span className="font-mono text-navy-700">{perm}</span>
                  <span className="text-right text-navy-500">{(roles as string[]).map(label).join(", ")}</span>
                </li>
              ))}
            </ul>
            <a href="/admin/audit-logs?entity=User" className={buttonClasses("ghost", "sm", "mt-3")}>View staff audit trail →</a>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
