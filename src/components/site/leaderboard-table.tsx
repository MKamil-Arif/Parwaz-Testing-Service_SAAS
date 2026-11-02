import { Medal } from "lucide-react";
import { Table, TD, TH, THead, TR } from "@/components/ui/layout";
import { Badge } from "@/components/ui/badge";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/cn";

type Row = {
  resultId: number;
  userId: number;
  rank: number;
  name: string;
  district: string;
  score: number;
  maxScore: number;
  percentage: number;
  prize: string | null;
};

export function LeaderboardTable({ rows, highlightUserId, competitionName }: { rows: Row[]; highlightUserId?: number; competitionName?: string }) {
  return (
    <Table>
      <THead>
        <tr>
          <TH className="w-20">Position</TH>
          <TH>Student</TH>
          <TH>District</TH>
          {competitionName && <TH>Competition</TH>}
          <TH className="text-right">Marks</TH>
          <TH className="text-right">Percentage</TH>
          <TH>Prize eligibility</TH>
        </tr>
      </THead>
      <tbody>
        {rows.map((r) => (
          <TR key={r.resultId} className={cn(r.userId === highlightUserId && "bg-gold-50 hover:bg-gold-50")}>
            <TD>
              <span
                className={cn(
                  "inline-grid size-8 place-items-center rounded-lg font-display text-sm font-extrabold",
                  r.rank === 1 ? "bg-gold-400 text-navy-950" : r.rank <= 3 ? "bg-gold-100 text-gold-700" : "bg-navy-50 text-navy-700",
                )}
              >
                {r.rank <= 3 ? <Medal className="size-4" /> : r.rank}
              </span>
              {r.rank <= 3 && <span className="ml-2 text-xs font-bold text-navy-700">#{r.rank}</span>}
            </TD>
            <TD className="font-semibold text-navy-950">
              {r.name}
              {r.userId === highlightUserId && <Badge tone="gold" className="ml-2">You</Badge>}
            </TD>
            <TD>{r.district}</TD>
            {competitionName && <TD>{competitionName}</TD>}
            <TD className="text-right font-semibold tabular-nums">
              {formatNumber(r.score, 2)} / {formatNumber(r.maxScore, 2)}
            </TD>
            <TD className="text-right tabular-nums">{formatPercent(r.percentage)}</TD>
            <TD>{r.prize ? <Badge tone="gold">{r.prize}</Badge> : <span className="text-navy-400">—</span>}</TD>
          </TR>
        ))}
      </tbody>
    </Table>
  );
}
