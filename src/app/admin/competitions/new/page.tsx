import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/guards";
import { PageHeader } from "@/components/ui/layout";
import { CompetitionForm } from "../competition-form";

export const metadata: Metadata = { title: "New competition" };

export default async function NewCompetitionPage() {
  await requireStaff("competitions.manage");
  return (
    <div className="max-w-4xl">
      <PageHeader title="New competition" description="Saved as a draft. Add questions and prizes, then publish." back={{ href: "/admin/competitions", label: "Competitions" }} />
      <CompetitionForm />
    </div>
  );
}
