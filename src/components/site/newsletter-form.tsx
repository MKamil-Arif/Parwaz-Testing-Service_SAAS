import { subscribeNewsletter } from "@/actions/public";
import { ActionForm, SubmitButton } from "@/components/ui/form-client";
import { cn } from "@/lib/cn";

export function NewsletterForm({ source, dark }: { source: string; dark?: boolean }) {
  return (
    <ActionForm action={subscribeNewsletter} resetOnSuccess className="flex flex-col gap-2 sm:flex-row" compact>
      <input type="hidden" name="source" value={source} />
      <label htmlFor={`nl-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`nl-${source}`}
        name="email"
        type="email"
        required
        placeholder="you@example.com"
        className={cn(
          "h-11 min-w-0 flex-1 rounded-xl px-3.5 text-sm focus:outline-none focus:ring-3",
          dark
            ? "bg-white/5 text-white ring-1 ring-white/15 placeholder:text-navy-400 focus:ring-gold-400/40"
            : "border border-navy-200 bg-white text-navy-950 focus:ring-brand-100",
        )}
      />
      <SubmitButton variant="gold" size="lg" className="h-11">
        Subscribe
      </SubmitButton>
    </ActionForm>
  );
}
