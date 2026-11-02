import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/cn";

/** Renders admin-editable markdown. Raw HTML is not rendered (XSS-safe by default). */
export function Prose({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-rp", className)}>
      <ReactMarkdown
        skipHtml
        components={{
          a: ({ href, children }) => (
            <a href={href} rel="noopener noreferrer" target={href?.startsWith("/") ? undefined : "_blank"}>
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
