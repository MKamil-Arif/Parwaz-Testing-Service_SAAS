import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ExternalLink, Trash } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/auth/guards";
import { competitionPhase, PHASE_LABEL, publishBlockers } from "@/lib/competition-rules";
import { COMPETITION_STATUS, PRIZE_CATEGORY, QUESTION_STATUS, REGISTRATION_STATUS, label } from "@/lib/constants";
import { formatNumber, formatPKR } from "@/lib/format";
import { addPoolQuestionsAction, deleteCompetitionAction, deletePrizeAction, removePoolQuestionAction, savePrizeAction, setCompetitionStatusAction } from "@/actions/admin/competitions";
import { PageHeader, LinkTabs, Alert, Table, THead, TH, TR, TD, StatCard, EmptyState } from "@/components/ui/layout";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { CompetitionForm } from "../competition-form";

export const metadata: Metadata = { title: "Edit competition" };

export default async function EditCompetitionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; created?: string }> }) {
  await requireStaff("competitions.manage");
  const { id } = await params;
  const { tab = "details", created } = await searchParams;
  const c = await db.competition.findUnique({
    where: { id: Number(id) || 0 },
    include: {
      eligibleClasses: true,
      prizes: { orderBy: { rankFrom: "asc" }, include: { _count: { select: { allocations: true } } } },
      questions: { include: { question: { include: { category: true } } }, orderBy: { questionId: "asc" } },
      registrations: { select: { status: true } },
    },
  });
  if (!c) notFound();
  const categories = await db.questionCategory.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { questions: { where: { status: QUESTION_STATUS.ACTIVE } } } } } });
  const attempts = await db.examAttempt.count({ where: { registration: { competitionId: c.id } } });
  const activePool = c.questions.filter((q) => q.question.status === QUESTION_STATUS.ACTIVE);
  const blockers = publishBlockers({
    questionCount: c.questionCount,
    marksPerQuestion: c.marksPerQuestion,
    poolMarks: activePool.map((q) => q.question.marks),
    times: c,
    durationMinutes: c.durationMinutes,
    prizeRanges: c.prizes,
  });
  const base = `/admin/competitions/${c.id}`;
  const confirmed = c.registrations.filter((r) => r.status === REGISTRATION_STATUS.CONFIRMED).length;

  return (
    <>
      <PageHeader
        title={c.title}
        back={{ href: "/admin/competitions", label: "Competitions" }}
        description={`${PHASE_LABEL[competitionPhase(c)]} · ${formatPKR(c.registrationFee)} · ${c.questionCount} questions · ${formatNumber(c.totalMarks, 2)} marks`}
        actions={
          <>
            <StatusBadge status={c.status} />
            {c.status === COMPETITION_STATUS.PUBLISHED && (
              <Link href={`/competitions/${c.slug}`} target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                Public page <ExternalLink className="size-3.5" />
              </Link>
            )}
          </>
        }
      />
      {created && (
        <Alert tone="success" className="mb-6" title="Competition created as a draft">
          Next, add questions to the pool and configure prizes, then publish.
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <StatCard label="Confirmed registrations" value={confirmed} hint={c.targetRegistrations ? `Target ${formatNumber(c.targetRegistrations)}` : undefined} />
        <StatCard label="Question pool" value={`${activePool.length}/${c.questionCount}`} tone={activePool.length < c.questionCount ? "amber" : "green"} />
        <StatCard label="Prize tiers" value={c.prizes.length} tone="gold" />
        <StatCard label="Exam attempts" value={attempts} tone="navy" />
      </div>

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center gap-3">
          <p className="mr-auto text-sm text-navy-600">
            {c.status === COMPETITION_STATUS.DRAFT
              ? blockers.length
                ? `${blockers.length} issue(s) to fix before publishing.`
                : "Ready to publish."
              : `This competition is ${label(c.status).toLowerCase()}.`}
          </p>
          {c.status !== COMPETITION_STATUS.PUBLISHED && (
            <ActionForm action={setCompetitionStatusAction} compact className="flex items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="PUBLISHED" />
              <SubmitButton size="sm">Publish</SubmitButton>
            </ActionForm>
          )}
          {c.status === COMPETITION_STATUS.PUBLISHED && (
            <ActionForm action={setCompetitionStatusAction} compact className="flex items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="DRAFT" />
              <SubmitButton size="sm" variant="secondary">Unpublish</SubmitButton>
            </ActionForm>
          )}
          {c.status !== COMPETITION_STATUS.ARCHIVED && (
            <ActionForm action={setCompetitionStatusAction} compact className="flex items-center gap-2">
              <input type="hidden" name="id" value={c.id} />
              <input type="hidden" name="status" value="ARCHIVED" />
              <SubmitButton size="sm" variant="secondary" confirm="Archive this competition? It stays visible as a completed record.">
                Archive
              </SubmitButton>
            </ActionForm>
          )}
          <ActionForm action={deleteCompetitionAction} compact className="flex items-center gap-2">
            <input type="hidden" name="id" value={c.id} />
            <SubmitButton size="sm" variant="danger-soft" confirm="Permanently delete this competition? Only possible when it has no registrations.">
              Delete
            </SubmitButton>
          </ActionForm>
        </CardBody>
        {c.status === COMPETITION_STATUS.DRAFT && blockers.length > 0 && (
          <div className="border-t border-navy-100 px-5 py-3">
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
              {blockers.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <LinkTabs
        tabs={[
          { href: `${base}?tab=details`, label: "Details", active: tab === "details" },
          { href: `${base}?tab=questions`, label: `Question pool (${activePool.length})`, active: tab === "questions" },
          { href: `${base}?tab=prizes`, label: `Prizes (${c.prizes.length})`, active: tab === "prizes" },
        ]}
      />

      {tab === "details" && (
        <div className="max-w-4xl">
          <CompetitionForm c={c} />
        </div>
      )}

      {tab === "questions" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card className="overflow-hidden">
            <CardHeader title="Questions in the pool" description={c.randomizeQuestions ? `Each student receives ${c.questionCount} randomly selected questions from this pool.` : `Students receive the first ${c.questionCount} questions in order.`} />
            {c.questions.length === 0 ? (
              <EmptyState title="The pool is empty" description="Add questions from the bank using the panel." />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>ID</TH>
                    <TH>Question</TH>
                    <TH>Category</TH>
                    <TH>Marks</TH>
                    <TH />
                  </tr>
                </THead>
                <tbody>
                  {c.questions.map(({ question: q }) => (
                    <TR key={q.id}>
                      <TD className="font-mono text-xs">{q.id}</TD>
                      <TD className="max-w-md">
                        <p className="line-clamp-2">{q.text}</p>
                        {q.status !== QUESTION_STATUS.ACTIVE && <Badge tone="red">Archived — not served</Badge>}
                      </TD>
                      <TD>{q.category.name}</TD>
                      <TD>{c.marksPerQuestion ?? q.marks}</TD>
                      <TD className="text-right">
                        {attempts === 0 && (
                          <form action={removePoolQuestionAction.bind(null, c.id, q.id)}>
                            <button type="submit" className="text-red-600 hover:text-red-800" aria-label="Remove from pool">
                              <Trash className="size-4" />
                            </button>
                          </form>
                        )}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card className="h-fit">
            <CardHeader title="Add questions" />
            <CardBody>
              {attempts > 0 ? (
                <Alert tone="warning">The pool is locked because students have started this examination.</Alert>
              ) : (
                <ActionForm action={addPoolQuestionsAction} className="space-y-4">
                  <input type="hidden" name="competitionId" value={c.id} />
                  <Field label="All active questions from a category" name="categoryId">
                    <Select id="categoryId" name="categoryId" placeholder="—" defaultValue="" options={categories.map((cat) => ({ value: String(cat.id), label: `${cat.name} (${cat._count.questions})` }))} />
                  </Field>
                  <Field label="and/or specific question IDs" name="questionIds" hint="Comma or space separated">
                    <Textarea id="questionIds" name="questionIds" rows={2} placeholder="12, 15, 18" />
                  </Field>
                  <SubmitButton>Add to pool</SubmitButton>
                  <p className="text-xs text-navy-500">
                    Manage questions in the <Link href="/admin/questions" className="font-semibold text-brand-700">question bank</Link>.
                  </p>
                </ActionForm>
              )}
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "prizes" && (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <Card className="overflow-hidden">
            <CardHeader title="Prize tiers" description={`Total estimated prize fund: ${formatPKR(c.prizes.reduce((a, p) => a + p.quantity * Number(p.estimatedUnitValue), 0))}`} />
            {c.prizes.length === 0 ? (
              <EmptyState title="No prizes configured" />
            ) : (
              <Table>
                <THead>
                  <tr>
                    <TH>Ranks</TH>
                    <TH>Prize</TH>
                    <TH>Qty</TH>
                    <TH>Est. unit value</TH>
                    <TH>Allocated</TH>
                    <TH />
                  </tr>
                </THead>
                <tbody>
                  {c.prizes.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-semibold">
                        {p.rankFrom}–{p.rankTo}
                      </TD>
                      <TD>
                        {p.title} <Badge>{label(p.category)}</Badge>
                      </TD>
                      <TD>{p.quantity}</TD>
                      <TD>{formatPKR(p.estimatedUnitValue)}</TD>
                      <TD>{p._count.allocations}</TD>
                      <TD className="text-right">
                        {p._count.allocations === 0 && (
                          <form action={deletePrizeAction.bind(null, p.id)}>
                            <button type="submit" className="text-red-600 hover:text-red-800" aria-label="Delete prize tier">
                              <Trash className="size-4" />
                            </button>
                          </form>
                        )}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
          <Card className="h-fit">
            <CardHeader title="Add prize tier" />
            <CardBody>
              <ActionForm action={savePrizeAction} resetOnSuccess className="grid grid-cols-2 gap-3">
                <input type="hidden" name="competitionId" value={c.id} />
                <Field label="Title" name="title" className="col-span-2">
                  <Input id="title" name="title" placeholder="Laptop" required />
                </Field>
                <Field label="Category" name="category" className="col-span-2">
                  <Select id="category" name="category" options={Object.values(PRIZE_CATEGORY).map((v) => ({ value: v, label: label(v) }))} />
                </Field>
                <Field label="Rank from" name="rankFrom">
                  <Input id="rankFrom" name="rankFrom" type="number" min={1} required />
                </Field>
                <Field label="Rank to" name="rankTo">
                  <Input id="rankTo" name="rankTo" type="number" min={1} required />
                </Field>
                <Field label="Quantity" name="quantity">
                  <Input id="quantity" name="quantity" type="number" min={1} required />
                </Field>
                <Field label="Est. value (PKR)" name="estimatedUnitValue">
                  <Input id="estimatedUnitValue" name="estimatedUnitValue" type="number" min={0} required />
                </Field>
                <Field label="Description" name="description" className="col-span-2">
                  <Input id="description" name="description" placeholder="e.g. Core i5, 8 GB RAM, 256 GB SSD" />
                </Field>
                <input type="hidden" name="sortOrder" value={c.prizes.length} />
                <div className="col-span-2">
                  <SubmitButton>Add prize tier</SubmitButton>
                </div>
              </ActionForm>
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
