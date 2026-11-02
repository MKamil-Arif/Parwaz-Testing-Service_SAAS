import type { Metadata } from "next";
import { Trash } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { ANNOUNCEMENT_TYPE, label } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { deleteAnnouncementAction, saveAnnouncementAction, toggleAnnouncementAction } from "@/actions/admin/marketing";
import { PageHeader, Table, THead, TH, TR, TD, EmptyState } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select, Textarea } from "@/components/ui/form";
import { buttonClasses } from "@/components/ui/button";
import { MarketingTabs } from "../tabs";

export const metadata: Metadata = { title: "Announcements" };

export default async function AnnouncementsPage() {
  await requireStaff("marketing.manage");
  const [items, competitions, ceremonies] = await Promise.all([
    db.announcement.findMany({ orderBy: { createdAt: "desc" }, include: { competition: { select: { title: true } }, ceremony: { select: { title: true } } } }),
    db.competition.findMany({ select: { id: true, title: true } }),
    db.awardCeremony.findMany({ select: { id: true, title: true } }),
  ]);
  return (
    <>
      <PageHeader title="Marketing" description="Site-wide promotional banners and news announcements." />
      <MarketingTabs active="announcements" />
      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="overflow-hidden">
          {items.length === 0 ? (
            <EmptyState title="No announcements yet" />
          ) : (
            <Table>
              <THead>
                <tr>
                  <TH>Announcement</TH>
                  <TH>Type</TH>
                  <TH>Window</TH>
                  <TH>Live</TH>
                  <TH />
                </tr>
              </THead>
              <tbody>
                {items.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <p className="font-semibold text-navy-950">{a.title}</p>
                      <p className="line-clamp-1 text-xs text-navy-500">{a.body}</p>
                      {(a.competition || a.ceremony) && <p className="text-xs text-navy-400">{a.competition?.title ?? a.ceremony?.title}</p>}
                    </TD>
                    <TD>
                      <Badge tone={a.type === "BANNER" ? "gold" : "blue"}>{label(a.type)}</Badge>
                    </TD>
                    <TD className="text-xs">
                      {a.startsAt ? formatDateTime(a.startsAt) : "Now"} → {a.endsAt ? formatDateTime(a.endsAt) : "no end"}
                    </TD>
                    <TD>
                      <form action={toggleAnnouncementAction.bind(null, a.id)}>
                        <button type="submit" className={buttonClasses(a.isPublished ? "primary" : "secondary", "xs")}>
                          {a.isPublished ? "Published" : "Draft"}
                        </button>
                      </form>
                    </TD>
                    <TD>
                      <form action={deleteAnnouncementAction.bind(null, a.id)}>
                        <button type="submit" aria-label="Delete" className="text-red-600 hover:text-red-800">
                          <Trash className="size-4" />
                        </button>
                      </form>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card className="h-fit">
          <CardHeader title="New announcement" description="Only one banner shows at a time — the newest published one in its window." />
          <CardBody>
            <ActionForm action={saveAnnouncementAction} resetOnSuccess className="grid gap-3 sm:grid-cols-2">
              <Field label="Type" name="type">
                <Select id="type" name="type" options={Object.values(ANNOUNCEMENT_TYPE).map((v) => ({ value: v, label: label(v) }))} />
              </Field>
              <div className="flex items-end">
                <CheckboxField name="isPublished" label="Publish now" />
              </div>
              <Field label="Title" name="title" className="sm:col-span-2">
                <Input id="title" name="title" required />
              </Field>
              <Field label="Body" name="body" className="sm:col-span-2">
                <Textarea id="body" name="body" rows={3} />
              </Field>
              <Field label="Link" name="linkUrl">
                <Input id="linkUrl" name="linkUrl" placeholder="/competitions" />
              </Field>
              <Field label="Link label" name="linkLabel">
                <Input id="linkLabel" name="linkLabel" placeholder="Register now" />
              </Field>
              <Field label="Starts (PKT)" name="startsAt">
                <Input id="startsAt" name="startsAt" type="datetime-local" />
              </Field>
              <Field label="Ends (PKT)" name="endsAt">
                <Input id="endsAt" name="endsAt" type="datetime-local" />
              </Field>
              <Field label="Competition" name="competitionId">
                <Select id="competitionId" name="competitionId" placeholder="—" defaultValue="" options={competitions.map((c) => ({ value: String(c.id), label: c.title }))} />
              </Field>
              <Field label="Ceremony" name="ceremonyId">
                <Select id="ceremonyId" name="ceremonyId" placeholder="—" defaultValue="" options={ceremonies.map((c) => ({ value: String(c.id), label: c.title }))} />
              </Field>
              <div className="sm:col-span-2">
                <SubmitButton>Save announcement</SubmitButton>
              </div>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
