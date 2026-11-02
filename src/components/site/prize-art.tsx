import { cn } from "@/lib/cn";

/** Device illustrations (no stock photos): laptop and Chromebook line art. */
export function PrizeArt({ category, className }: { category: string; className?: string }) {
  if (category === "CHROMEBOOK") {
    return (
      <svg viewBox="0 0 220 140" className={cn("w-full", className)} aria-hidden="true">
        <rect x="46" y="14" width="128" height="84" rx="7" fill="#1c2c55" />
        <rect x="53" y="21" width="114" height="70" rx="3" fill="#eef4ff" />
        <rect x="61" y="30" width="44" height="6" rx="3" fill="#91b2fd" />
        <rect x="61" y="42" width="98" height="4" rx="2" fill="#c9d4ec" />
        <rect x="61" y="51" width="80" height="4" rx="2" fill="#c9d4ec" />
        <rect x="61" y="66" width="30" height="16" rx="4" fill="#d8ad3f" />
        <circle cx="146" cy="74" r="9" fill="#284ddc" />
        <path d="M30 100h160l-10 14H40z" fill="#344d8a" />
        <rect x="96" y="102" width="28" height="4" rx="2" fill="#9db0d9" />
        <ellipse cx="110" cy="126" rx="78" ry="5" fill="#122042" opacity="0.08" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 220 140" className={cn("w-full", className)} aria-hidden="true">
      <rect x="38" y="8" width="144" height="92" rx="8" fill="#122042" />
      <rect x="45" y="15" width="130" height="78" rx="3" fill="#0a142d" />
      <path d="M45 93 130 15h45v78z" fill="#1c2c55" opacity="0.7" />
      <rect x="55" y="26" width="52" height="7" rx="3.5" fill="#e4c463" />
      <rect x="55" y="40" width="90" height="4" rx="2" fill="#4864a6" />
      <rect x="55" y="49" width="70" height="4" rx="2" fill="#4864a6" />
      <rect x="55" y="62" width="40" height="22" rx="4" fill="#284ddc" />
      <rect x="101" y="62" width="40" height="22" rx="4" fill="#344d8a" />
      <path d="M18 102h184l-12 16H30z" fill="#283d70" />
      <rect x="95" y="104" width="30" height="4" rx="2" fill="#6a85bf" />
      <ellipse cx="110" cy="130" rx="90" ry="5" fill="#122042" opacity="0.08" />
    </svg>
  );
}
