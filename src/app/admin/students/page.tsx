import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { CLASS_LEVELS, DISTRICT_OPTIONS, ROLES, USER_STATUS, classLabel } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { PAGE_SIZE, pageParam, skipTake } from "@/lib/admin-helpers";
import { PageHeader, EmptyState, Table, THead, TH, TR, TD, Pagination } from "@/components/ui/layout";
import { Card } from "@/components/ui/card";
import { Badge, SampleBadge, StatusBadge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";

export const metadata: Metadata = { title: "Students" };

type SP = { q?: string; district?: string; classLevel?: string; status?: string; page?: string };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireStaff("students.manage");
  const sp = await searchParams;
  const page = pageParam(sp.page);
  const where = {
    roles: { some: { role: { name: ROLES.STUDENT } } },
    ...(sp.q ? { OR: [{ fullName: { contains: sp.q } }, { email: { contains: sp.q } }, { phone: { contains: sp.q } }] } : {}),
    ...(sp.status ? { status: sp.status } : {}),
    ...(sp.district || sp.classLevel ? { profile: { ...(sp.district ? { district: sp.district } : {}), ...(sp.classLevel ? { classLevel: sp.classLevel } : {}) } } : {}),
  };
  const [users, total] = await Promise.all([
    db.user.findMany({ where, include: { profile: true, _count: { select: { registrations: true } } }, orderBy: { createdAt: "desc" }, ...skipTake(page) }),
    db.user.count({ where }),
  ]);
  return (
    <>
      <PageHeader title="Student management" description={`${total} student account(s)`} />
      <Card className="overflow-hidden">
        <form method="get" className="flex flex-wrap gap-2 border-b border-navy-100 p-4">
          <Input name="q" defaultValue={sp.q} placeholder="Name, email or phone…" className="min-w-48 flex-1" />
          <Select name="district" defaultValue={sp.district ?? ""} placeholder="All districts" options={DISTRICT_OPTIONS} className="w-44" />
          <Select name="classLevel" defaultValue={sp.classLevel ?? ""} placeholder="All classes" options={CLASS_LEVELS} className="w-44" />
          <Select name="status" defaultValue={sp.status ?? ""} placeholder="Any status" options={Object.values(USER_STATUS)} className="w-36" />
          <button type="submit" className={buttonClasses("navy", "md")}>
            Filter
          </button>
        </form>
        {users.length === 0 ? (
          <EmptyState icon={Users} title="No students found" />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>Student</TH>
                <TH>Phone</TH>
                <TH>District</TH>
                <TH>Class</TH>
                <TH>Email</TH>
                <TH>Registrations</TH>
                <TH>Joined</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD>
                    <Link href={`/admin/students/${u.id}`} className="font-semibold text-navy-950 hover:text-brand-700">
                      {u.fullName}
                    </Link>
                    {u.isDemo && <span className="ml-2"><SampleBadge>Demo</SampleBadge></span>}
                    <p className="text-xs text-navy-500">{u.email}</p>
                  </TD>
                  <TD>{u.phone}</TD>
                  <TD>{u.profile?.district ?? "—"}</TD>
                  <TD className="text-xs">{classLabel(u.profile?.classLevel).split(" (")[0]}</TD>
                  <TD>{u.emailVerifiedAt ? <Badge tone="green">Verified</Badge> : <Badge tone="amber">Unverified</Badge>}</TD>
                  <TD>{u._count.registrations}</TD>
                  <TD>{formatDate(u.createdAt)}</TD>
                  <TD>
                    <StatusBadge status={u.status} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/students" params={{ q: sp.q, district: sp.district, classLevel: sp.classLevel, status: sp.status }} />
      </Card>
    </>
  );
}
