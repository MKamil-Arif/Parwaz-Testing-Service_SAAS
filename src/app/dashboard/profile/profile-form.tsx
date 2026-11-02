"use client";

import { useState } from "react";
import { updateProfileAction } from "@/actions/student";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select } from "@/components/ui/form";
import { CLASS_LEVELS, DISTRICT_OPTIONS, GUARDIAN_RELATIONS } from "@/lib/constants";

type Defaults = {
  fullName: string;
  phone: string;
  city: string;
  district: string;
  institution: string;
  classLevel: string;
  dateOfBirth: string;
  guardianName: string;
  guardianPhone: string;
  guardianRelation: string;
  guardianConsent: boolean;
  leaderboardNameMode: string;
  mediaConsent: boolean;
};

function age(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  const n = new Date();
  let a = n.getUTCFullYear() - d.getUTCFullYear();
  if (n.getUTCMonth() < d.getUTCMonth() || (n.getUTCMonth() === d.getUTCMonth() && n.getUTCDate() < d.getUTCDate())) a--;
  return a;
}

export function ProfileForm({ defaults: d }: { defaults: Defaults }) {
  const [dob, setDob] = useState(d.dateOfBirth);
  const a = age(dob);
  const minor = a !== null && a < 18;
  return (
    <ActionForm action={updateProfileAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name" name="fullName" required className="sm:col-span-2">
        <Input id="fullName" name="fullName" defaultValue={d.fullName} required />
      </Field>
      <Field label="Mobile number" name="phone" required>
        <Input id="phone" name="phone" type="tel" defaultValue={d.phone} required />
      </Field>
      <Field label="Date of birth" name="dateOfBirth" required>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} required />
      </Field>
      <Field label="City / town" name="city" required>
        <Input id="city" name="city" defaultValue={d.city} required />
      </Field>
      <Field label="District" name="district" required>
        <Select id="district" name="district" options={DISTRICT_OPTIONS} defaultValue={d.district} placeholder="Select district" required />
      </Field>
      <Field label="School or college" name="institution" required className="sm:col-span-2">
        <Input id="institution" name="institution" defaultValue={d.institution} required />
      </Field>
      <Field label="Current class" name="classLevel" required className="sm:col-span-2">
        <Select id="classLevel" name="classLevel" options={CLASS_LEVELS} defaultValue={d.classLevel} placeholder="Select class" required />
      </Field>

      {minor && (
        <div className="grid gap-4 rounded-2xl bg-gold-50 p-4 ring-1 ring-gold-100 sm:col-span-2 sm:grid-cols-2">
          <p className="text-sm font-semibold text-gold-700 sm:col-span-2">Parent / guardian (required under 18)</p>
          <Field label="Guardian name" name="guardianName" required>
            <Input id="guardianName" name="guardianName" defaultValue={d.guardianName} required />
          </Field>
          <Field label="Relationship" name="guardianRelation" required>
            <Select id="guardianRelation" name="guardianRelation" options={GUARDIAN_RELATIONS} defaultValue={d.guardianRelation} placeholder="Select" required />
          </Field>
          <Field label="Guardian mobile" name="guardianPhone" required className="sm:col-span-2">
            <Input id="guardianPhone" name="guardianPhone" type="tel" defaultValue={d.guardianPhone} required />
          </Field>
          <div className="sm:col-span-2">
            <CheckboxField name="guardianConsent" defaultChecked={d.guardianConsent} required label="My parent/guardian consents to my participation in Rewarding Potential competitions." />
          </div>
        </div>
      )}

      <div className="space-y-4 border-t border-navy-100 pt-4 sm:col-span-2">
        <Field label="Name on public leaderboards" name="leaderboardNameMode">
          <Select
            id="leaderboardNameMode"
            name="leaderboardNameMode"
            defaultValue={d.leaderboardNameMode}
            options={[
              { value: "INITIALS", label: "First name + last initial (e.g. Ayesha K.) — recommended" },
              { value: "FULL", label: "Full name" },
            ]}
          />
        </Field>
        <CheckboxField
          name="mediaConsent"
          defaultChecked={d.mediaConsent}
          label="If I win, Rewarding Potential may publish my full name, school and award-ceremony photos (with my parent/guardian's agreement if I am under 18)."
          hint="Optional. Without this, winners are announced with initials only and no photos."
        />
      </div>
      <div className="sm:col-span-2">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </ActionForm>
  );
}
