"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, ChartColumn } from "lucide-react";
import { cn } from "@/lib/cn";

// Validated default categorical palette (light mode), assigned in fixed order.
export const SERIES_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"] as const;
const GRID = "#e6eaf2";
const INK_MUTED = "#4864a6";
const INK = "#0a142d";

type Series = { key: string; label: string };
type Row = Record<string, string | number>;
type Format = "number" | "pkr";

function fmt(v: number, format: Format) {
  const n = new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(v);
  return format === "pkr" ? `PKR ${n}` : n;
}
function fmtAxis(v: number, format: Format) {
  const n = new Intl.NumberFormat("en-PK", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  return format === "pkr" ? n : n;
}

function ChartTooltip({
  active,
  payload,
  label,
  format,
  series,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number; color?: string }[];
  label?: string | number;
  format: Format;
  series: Series[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-navy-100 bg-white px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-semibold" style={{ color: INK }}>
        {label}
      </p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2" style={{ color: INK }}>
          <span className="size-2.5 rounded-sm" style={{ background: p.color }} />
          <span className="text-navy-500">{series.find((s) => s.key === p.dataKey)?.label}</span>
          <span className="ml-auto pl-3 font-semibold tabular-nums">{fmt(Number(p.value ?? 0), format)}</span>
        </p>
      ))}
    </div>
  );
}

function DataTable({ data, xKey, series, format }: { data: Row[]; xKey: string; series: Series[]; format: Format }) {
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-left text-xs">
        <thead className="sticky top-0 bg-white text-navy-500">
          <tr>
            <th className="py-1.5 pr-3 font-semibold">{xKey === "label" ? "Category" : "Period"}</th>
            {series.map((s) => (
              <th key={s.key} className="py-1.5 pr-3 text-right font-semibold">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i} className="border-t border-navy-100">
              <td className="py-1.5 pr-3 text-navy-800">{r[xKey]}</td>
              {series.map((s) => (
                <td key={s.key} className="py-1.5 pr-3 text-right text-navy-900 tabular-nums">
                  {fmt(Number(r[s.key] ?? 0), format)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ChartCardProps = {
  title: string;
  description?: string;
  data: Row[];
  xKey: string;
  series: Series[];
  format?: Format;
  kind?: "bar" | "line";
  horizontal?: boolean;
  height?: number;
  emptyText?: string;
};

/** A chart with a title, hover tooltips, a legend for 2+ series and a table view toggle. */
export function ChartCard({
  title,
  description,
  data,
  xKey,
  series,
  format = "number",
  kind = "bar",
  horizontal,
  height = 260,
  emptyText = "No data yet",
}: ChartCardProps) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const empty = data.length === 0 || data.every((r) => series.every((s) => !Number(r[s.key])));
  const axisTick = { fill: INK_MUTED, fontSize: 11 };

  return (
    <figure className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
      <figcaption className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-navy-950">{title}</p>
          {description && <p className="mt-0.5 text-xs text-navy-500">{description}</p>}
        </div>
        {!empty && (
          <button
            type="button"
            onClick={() => setView(view === "chart" ? "table" : "chart")}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-navy-600 ring-1 ring-navy-200 hover:bg-navy-50"
            aria-label={view === "chart" ? "Show as table" : "Show as chart"}
          >
            {view === "chart" ? <Table2 className="size-3.5" /> : <ChartColumn className="size-3.5" />}
            {view === "chart" ? "Table" : "Chart"}
          </button>
        )}
      </figcaption>
      {empty ? (
        <div className="grid place-items-center rounded-xl bg-navy-50/60 text-sm text-navy-500" style={{ height }}>
          {emptyText}
        </div>
      ) : view === "table" ? (
        <DataTable data={data} xKey={xKey} series={series} format={format} />
      ) : (
        <div style={{ height }} className={cn("w-full")}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === "line" ? (
              <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={16} />
                <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtAxis(v, format)} allowDecimals={false} />
                <Tooltip content={<ChartTooltip format={format} series={series} />} cursor={{ stroke: "#9db0d9", strokeWidth: 1 }} />
                {series.length > 1 && <Legend iconType="plainline" wrapperStyle={{ fontSize: 12, color: INK }} formatter={(v) => series.find((s) => s.key === v)?.label} />}
                {series.map((s, i) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    stroke={SERIES_COLORS[i]}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    activeDot={{ r: 5, stroke: "#ffffff", strokeWidth: 2, fill: SERIES_COLORS[i] }}
                  />
                ))}
              </LineChart>
            ) : (
              <BarChart
                data={data}
                layout={horizontal ? "vertical" : "horizontal"}
                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                barGap={2}
                barCategoryGap="22%"
              >
                <CartesianGrid stroke={GRID} vertical={!!horizontal} horizontal={!horizontal} />
                {horizontal ? (
                  <>
                    <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={(v) => fmtAxis(v, format)} allowDecimals={false} />
                    <YAxis type="category" dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} width={130} />
                  </>
                ) : (
                  <>
                    <XAxis dataKey={xKey} tick={axisTick} tickLine={false} axisLine={{ stroke: GRID }} minTickGap={8} />
                    <YAxis tick={axisTick} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => fmtAxis(v, format)} allowDecimals={false} />
                  </>
                )}
                <Tooltip content={<ChartTooltip format={format} series={series} />} cursor={{ fill: "#f3f6fc" }} />
                {series.length > 1 && <Legend iconType="square" wrapperStyle={{ fontSize: 12, color: INK }} formatter={(v) => series.find((s) => s.key === v)?.label} />}
                {series.map((s, i) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    fill={SERIES_COLORS[i]}
                    maxBarSize={24}
                    radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </figure>
  );
}
