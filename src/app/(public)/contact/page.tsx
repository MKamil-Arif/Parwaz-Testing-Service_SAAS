import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getFaqs } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth/guards";
import { submitContact } from "@/actions/public";
import { PageHero, FaqList } from "@/components/site/sections";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { Field, Input, Select, Textarea } from "@/components/ui/form";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { label, TICKET_CATEGORY } from "@/lib/constants";

export const metadata: Metadata = { title: "Contact us" };

const CATEGORIES = Object.values(TICKET_CATEGORY)
  .filter((c) => c !== "RESULT_DISPUTE")
  .map((c) => ({ value: c, label: label(c) }));

export default async function ContactPage() {
  const [s, faqs, user] = await Promise.all([getSettings(), getFaqs(), getCurrentUser()]);
  const wa = s["contact.whatsapp"].replace(/[^\d]/g, "");
  const cards = [
    { Icon: Mail, t: "Email", v: s["contact.email"], href: `mailto:${s["contact.email"]}` },
    { Icon: Phone, t: "Phone", v: s["contact.phone"], href: `tel:${s["contact.phone"].replace(/\s/g, "")}` },
    { Icon: WhatsAppIcon, t: "WhatsApp", v: s["contact.whatsapp"], href: wa ? `https://wa.me/${wa}` : undefined },
    { Icon: MapPin, t: "Office", v: s["contact.address"] },
    { Icon: Clock, t: "Support hours", v: s["contact.hours"] },
  ];

  return (
    <>
      <PageHero
        eyebrow="Contact us"
        title="We're here to help"
        description="Questions about registration, payments, the exam or school partnerships? Send us a message and we'll respond as quickly as we can."
      />
      <section className="container-page grid gap-10 py-14 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-3">
          {cards.map(({ Icon, t, v, href }) => (
            <div key={t} className="flex items-start gap-4 rounded-2xl border border-navy-100 bg-white p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-xs font-semibold tracking-wide text-navy-500 uppercase">{t}</p>
                {href ? (
                  <a href={href} className="font-semibold text-navy-950 hover:text-brand-700" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
                    {v}
                  </a>
                ) : (
                  <p className="font-semibold text-navy-950">{v}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-navy-100 bg-white p-6 shadow-card sm:p-8">
          <h2 className="text-xl font-bold">Send us a message</h2>
          <p className="mt-1 mb-6 text-sm text-navy-500">You'll receive a reference number. Registered students can also track requests in their dashboard.</p>
          <ActionForm action={submitContact} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name" name="name" required>
              <Input id="name" name="name" required defaultValue={user?.fullName} autoComplete="name" />
            </Field>
            <Field label="Email" name="email" required>
              <Input id="email" name="email" type="email" required defaultValue={user?.email} autoComplete="email" />
            </Field>
            <Field label="Phone (optional)" name="phone">
              <Input id="phone" name="phone" type="tel" placeholder="0300 1234567" autoComplete="tel" />
            </Field>
            <Field label="Topic" name="category" required>
              <Select id="category" name="category" options={CATEGORIES} defaultValue="GENERAL" />
            </Field>
            <Field label="Subject" name="subject" required className="sm:col-span-2">
              <Input id="subject" name="subject" required maxLength={200} />
            </Field>
            <Field label="Message" name="message" required className="sm:col-span-2">
              <Textarea id="message" name="message" required rows={5} maxLength={5000} />
            </Field>
            {/* Honeypot: real users never see or fill this */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <div className="sm:col-span-2">
              <SubmitButton size="lg">Send message</SubmitButton>
            </div>
          </ActionForm>
        </div>
      </section>
      {faqs.length > 0 && (
        <section className="bg-surface py-14">
          <div className="container-page max-w-3xl">
            <h2 className="mb-6 text-2xl font-bold">Frequently asked questions</h2>
            <FaqList items={faqs} />
          </div>
        </section>
      )}
    </>
  );
}
