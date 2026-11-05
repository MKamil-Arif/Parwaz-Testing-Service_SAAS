import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Logo } from "./logo";
import { FacebookIcon, InstagramIcon, TikTokIcon, WhatsAppIcon, YouTubeIcon } from "@/components/ui/brand-icons";
import { NewsletterForm } from "./newsletter-form";

const columns = [
  {
    title: "Compete",
    links: [
      { href: "/competitions", label: "Competitions" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/prizes", label: "Prize gallery" },
      { href: "/winners", label: "Winners" },
      { href: "/ceremonies", label: "Award ceremonies" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About us" },
      { href: "/contact", label: "Contact us" },
      { href: "/help", label: "Help & support" },
      { href: "/register", label: "Create an account" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/competition-rules", label: "Competition rules" },
      { href: "/terms", label: "Terms & conditions" },
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/refund-policy", label: "Refund policy" },
    ],
  },
];

export async function Footer() {
  const s = await getSettings();
  const whatsappDigits = s["contact.whatsapp"].replace(/[^\d]/g, "");
  const socials = [
    { href: s["social.facebook"], label: "Facebook", Icon: FacebookIcon },
    { href: s["social.instagram"], label: "Instagram", Icon: InstagramIcon },
    { href: s["social.tiktok"], label: "TikTok", Icon: TikTokIcon },
    { href: s["social.youtube"], label: "YouTube", Icon: YouTubeIcon },
    { href: whatsappDigits ? `https://wa.me/${whatsappDigits}` : "", label: "WhatsApp", Icon: WhatsAppIcon },
  ].filter((x) => x.href);

  return (
    <footer className="bg-navy-950 text-navy-200">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_2fr]">
        <div className="max-w-sm">
          <Logo light />
          <p className="mt-5 text-sm leading-relaxed text-navy-300">
            An online academic testing platform for students across Sindh. Affordable competitions, fair online examinations and
            verified merit lists — with devices for the students who earn them.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-gold-400" />
              <a href={`mailto:${s["contact.email"]}`} className="hover:text-white">
                {s["contact.email"]}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-gold-400" /> {s["contact.phone"]}
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="size-4 text-gold-400" /> {s["contact.address"]}
            </li>
          </ul>
          {socials.length > 0 && (
            <div className="mt-6 flex gap-2">
              {socials.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-lg bg-white/5 text-navy-200 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-bold tracking-[0.14em] text-gold-300 uppercase">{col.title}</p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-navy-300 transition-colors hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="sm:col-span-3">
            <p className="text-sm font-semibold text-white">Get competition announcements</p>
            <p className="mt-1 text-xs text-navy-400">Registration dates, exam reminders and results — no spam, unsubscribe anytime.</p>
            <div className="mt-3 max-w-md">
              <NewsletterForm source="footer" dark />
            </div>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-navy-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Parwaz Testing Service. All rights reserved.</p>
          <p>{s["site.tagline"]}</p>
        </div>
      </div>
    </footer>
  );
}
