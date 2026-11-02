import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

type Message = { id: number; isStaff: boolean; body: string; createdAt: Date };

export function TicketThread({ messages, ownerName }: { messages: Message[]; ownerName: string }) {
  return (
    <ol className="space-y-4">
      {messages.map((m) => (
        <li key={m.id} className={cn("flex", m.isStaff ? "justify-start" : "justify-end")}>
          <div
            className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
              m.isStaff ? "rounded-tl-sm bg-navy-950 text-white" : "rounded-tr-sm bg-brand-50 text-navy-900 ring-1 ring-brand-100",
            )}
          >
            <p className={cn("mb-1 text-xs font-semibold", m.isStaff ? "text-gold-300" : "text-brand-700")}>
              {m.isStaff ? "Rewarding Potential support" : ownerName} · {formatDateTime(m.createdAt)}
            </p>
            <p className="whitespace-pre-line">{m.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
