"use client";

import Link from "next/link";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { registerAction } from "@/actions/auth";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { CheckboxField, Field, Input, Select } from "@/components/ui/form";
import { CLASS_LEVELS, DISTRICT_OPTIONS, GUARDIAN_RELATIONS } from "@/lib/constants";

function ageFrom(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const dob = new Date(`${value}T00:00:00Z`);
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const m = now.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && now.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 border-t border-navy-100 pt-6 sm:grid-cols-2">
      <legend className="-mt-3 mb-1 bg-white pr-3 text-xs font-bold tracking-[0.14em] text-navy-500 uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

export function RegisterForm({ next, referralCode }: { next: string; referralCode: string }) {
  const [dob, setDob] = useState("");
  const age = ageFrom(dob);
  const minor = age !== null && age < 18;

  return (
    <ActionForm action={registerAction} className="mt-8 space-y-8">
      <input type="hidden" name="next" value={next} />
      <Section title="Personal details">
        <Field label="Full name (as on school records)" name="fullName" required className="sm:col-span-2">
          <Input id="fullName" name="fullName" required autoComplete="name" maxLength={150} />
        </Field>
        <Field label="Email address" name="email" required>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </Field>
        <Field label="Mobile number" name="phone" required hint="e.g. 0300 1234567">
          <Input id="phone" name="phone" type="tel" required autoComplete="tel" inputMode="tel" />
        </Field>
        <Field label="Date of birth" name="dateOfBirth" required>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="City / town" name="city" required>
          <Input id="city" name="city" required autoComplete="address-level2" />
        </Field>
        <Field label="District" name="district" required>
          <Select id="district" name="district" required options={DISTRICT_OPTIONS} placeholder="Select district" defaultValue="" />
        </Field>
      </Section>

      <Section title="Education">
        <Field label="School or college" name="institution" required className="sm:col-span-2">
          <Input id="institution" name="institution" required maxLength={200} />
        </Field>
        <Field label="Current class" name="classLevel" required className="sm:col-span-2">
          <Select id="classLevel" name="classLevel" required options={CLASS_LEVELS} placeholder="Select your class" defaultValue="" />
        </Field>
      </Section>

      {minor && (
        <Section title="Parent / guardian consent">
          <div className="flex gap-3 rounded-xl bg-gold-50 px-4 py-3 text-sm text-gold-700 ring-1 ring-gold-100 sm:col-span-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            Because you are under 18, a parent or guardian must agree to your participation. We may contact them to verify before
            awarding any prize.
          </div>
          <Field label="Parent/guardian full name" name="guardianName" required>
            <Input id="guardianName" name="guardianName" required />
          </Field>
          <Field label="Relationship" name="guardianRelation" required>
            <Select id="guardianRelation" name="guardianRelation" required options={GUARDIAN_RELATIONS} placeholder="Select" defaultValue="" />
          </Field>
          <Field label="Parent/guardian mobile number" name="guardianPhone" required className="sm:col-span-2">
            <Input id="guardianPhone" name="guardianPhone" type="tel" required inputMode="tel" />
          </Field>
          <div className="sm:col-span-2">
            <CheckboxField
              name="guardianConsent"
              required
              label="My parent/guardian has read the competition rules and privacy policy, and consents to my registration and participation."
            />
          </div>
        </Section>
      )}

      <Section title="Account security">
        <Field label="Password" name="password" required hint="At least 8 characters with a letter and a number">
          <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        </Field>
        <Field label="Confirm password" name="confirmPassword" required>
          <Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" />
        </Field>
        <Field label="Referral code (optional)" name="referralCode" hint="From a friend or student ambassador">
          <Input id="referralCode" name="referralCode" defaultValue={referralCode} maxLength={16} className="uppercase" />
        </Field>
      </Section>

      <div className="space-y-5 border-t border-navy-100 pt-6">
        <CheckboxField
          name="acceptTerms"
          required
          label={
            <>
              I accept the{" "}
              <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">
                Terms and Conditions
              </Link>
              , the{" "}
              <Link href="/privacy-policy" target="_blank" className="font-semibold text-brand-700 underline">
                Privacy Policy
              </Link>{" "}
              and the{" "}
              <Link href="/competition-rules" target="_blank" className="font-semibold text-brand-700 underline">
                Competition Rules
              </Link>
              .
            </>
          }
        />
        <SubmitButton size="lg" className="w-full" pendingText="Creating your account…">
          Create account
        </SubmitButton>
      </div>
    </ActionForm>
  );
}
