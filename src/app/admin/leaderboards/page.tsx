import Link from "next/link";
import type { Metadata } from "next";
import { Medal } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { getLeaderboard } from "@/lib/leaderboard";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "@/actions/admin/content";
import { PageHeader, EmptyState, LinkTabs, Alert } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input } from "@/components/ui/form";
import { LeaderboardTable } from "@/components/site/leaderboard-table";

export const metadata: Metadata = { title: "Leaderboards" };

export default async function LeaderboardsAdminPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  await requireStaff("results.manage");
  const { c } = await searchParams;
  const comps = await db.competition.findMany({ where: { meritGeneratedAt: { not: null } }, orderBy: { meritGeneratedAt: "desc" } });
  const selected = comps.find((x) => String(x.id) === c) ?? comps[0];
  const [rows, settings] = await Promise.all([selected ? getLeaderboard(selected.id, 200) : Promise.resolve([]), getSettings()]);

  return (
    <>
      <PageHeader title="Leaderboard management" description="Preview merit lists exactly as students will see them (privacy-safe names) before and after publication." />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div>
          {!selected ? (
            <Card>
              <EmptyState icon={Medal} title="No merit lists generated yet" description="Generate one from Results & merit lists." />
            </Card>
          ) : (
            <>
              <LinkTabs tabs={comps.map((x) => ({ href: `/admin/leaderboards?c=${x.id}`, label: x.title, active: x.id === selected.id }))} />
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <StatusBadge status={selected.resultsStatus} />
                {selected.resultsStatus === "PUBLISHED" ? (
                  <Link href={`/competitions/${selected.slug}/leaderboard`} target="_blank" className="text-sm font-semibold text-brand-700">
                    Open public leaderboard ↗
                  </Link>
                ) : (
                  <Alert tone="info" className="py-2">Not visible to students until results are published.</Alert>
                )}
                <Link href={`/admin/results/${selected.id}`} className="text-sm font-semibold text-brand-700">
                  Manage results →
                </Link>
              </div>
              <Card className="overflow-hidden">
                <LeaderboardTable rows={rows} />
              </Card>
            </>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader title="Public display" />
          <CardBody>
            <ActionForm action={saveSettingsAction} className="space-y-3">
              <Field label="Ranks shown on public leaderboards" name="leaderboard.publicLimit" hint="Students always see their own position in their dashboard.">
                <Input id="leaderboard.publicLimit" name="leaderboard.publicLimit" type="number" min={10} max={1000} defaultValue={settings["leaderboard.publicLimit"]} />
              </Field>
              <SubmitButton size="sm">Save</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
