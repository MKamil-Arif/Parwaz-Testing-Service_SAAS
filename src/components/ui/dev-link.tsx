/** Development-only helper shown when no SMTP server is configured, so email links can be tested locally. */
export function DevLink({ href, label }: { href: string; label: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gold-400 bg-gold-50 px-4 py-3 text-sm">
      <p className="text-xs font-bold tracking-wide text-gold-700 uppercase">Development mode — email not sent (no SMTP)</p>
      <a href={href} className="mt-1 block font-semibold break-all text-brand-700 underline">
        {label}
      </a>
    </div>
  );
}
