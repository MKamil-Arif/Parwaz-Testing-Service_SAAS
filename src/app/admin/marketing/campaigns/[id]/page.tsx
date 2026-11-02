import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/layout";
import { Card, CardBody } from "@/components/ui/card";
import { CampaignForm } from "../../campaign-form";

export const metadata: Metadata = { title: "Edit campaign" };

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("marketing.manage");
  const { id } = await params;
  const c = await db.marketingCampaign.findUnique({ where: { id: Number(id) || 0 } });
  if (!c) notFound();
  const competitions = await db.competition.findMany({ where: { status: "PUBLISHED" }, select: { id: true, title: true } });
  return (
    <div className="max-w-3xl">
      <PageHeader title={c.name} back={{ href: "/admin/marketing", label: "Marketing" }} />
      <Card>
        <CardBody className="py-6">
          <CampaignForm c={c} competitions={competitions} />
        </CardBody>
      </Card>
    </div>
  );
}
