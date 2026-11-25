"use client";
import { useMemo, useState } from "react";
import { Clock3, Download, Table2, Trophy, Users } from "lucide-react";
import { PUMP_TYPES, SEGMENTS, SEG_COLOR, SOURCES, SRC_COLOR } from "@/lib/data";
import { daysBetween, downloadCsv, int, monthLabel, monthStart, pct, today, zar, zarAxis, zarK } from "@/lib/format";
import { inMonth, sum, useStore, winRate } from "@/lib/store";
import { Count, PageHead, Panel, Seg, useEnter } from "@/components/ui/bits";
import { Cols, DataTable, Donut, HBars, LineArea, Stacked } from "@/components/charts/charts";

export default function Reports() {
  const { s, customer } = useStore();
  const root = useEnter();
  const [range, setRange] = useState<"3M" | "6M" | "12M">("6M");
  const [mode, setMode] = useState<"R" | "%">("R");
  const [table, setTable] = useState(false);
  const n = range === "3M" ? 3 : range === "6M" ? 6 : 12;

  const d = useMemo(() => {
    const ms = Array.from({ length: n }, (_, i) => monthStart(new Date(), n - 1 - i));
    const inRange = (x?: string) => !!x && ms.some((m) => inMonth(x, m));
    const won = s.deals.filter((x) => x.status === "won" && inRange(x.closedAt));
    const bySeg = ms.map((m) => ({
      label: monthLabel(m),
      values: Object.fromEntries(SEGMENTS.map((g) => [g, sum(won.filter((x) => inMonth(x.closedAt, m) && customer(x.customerId)?.segment === g))])),
    }));
    const segTotals = Object.fromEntries(SEGMENTS.map((g) => [g, bySeg.reduce((a, b) => a + (b.values[g] as number), 0)]));
    const src = SOURCES.map((k) => ({ key: k, value: won.filter((x) => x.source === k).length, color: SRC_COLOR[k] }));
    const count = ms.map((m) => ({ label: monthLabel(m), value: won.filter((x) => inMonth(x.closedAt, m)).length }));
    const rate = ms.map((m) => ({ label: monthLabel(m), value: winRate(s.deals.filter((x) => inMonth(x.closedAt, m))) }));
    const cycle = won.length ? won.reduce((a, x) => a + daysBetween(x.created, x.closedAt!), 0) / won.length : 0;
    const byPump = PUMP_TYPES.map((p) => {
      const xs = won.filter((x) => x.pumpType === p);
      return { label: p, value: xs.length ? xs.reduce((a, x) => a + daysBetween(x.created, x.closedAt!), 0) / xs.length : 0 };
    });
    const top = [...new Set(won.map((x) => x.customerId))].map((id) => ({ label: customer(id)?.company, value: sum(won.filter((x) => x.customerId === id)) })).sort((a, b) => b.value - a.value).slice(0, 5);
    return { won, bySeg, segTotals, src, count, rate, cycle, byPump, top, total: sum(won), buyers: new Set(won.map((x) => x.customerId)).size };
  }, [s.deals, n, customer]);

  const csv = () => downloadCsv(`fedpump-revenue-by-industry-${today()}.csv`, [["Month", ...SEGMENTS, "Total"], ...d.bySeg.map((m) => [m.label, ...SEGMENTS.map((g) => m.values[g] as number), SEGMENTS.reduce((a, g) => a + (m.values[g] as number), 0)])]);

  return (
    <div ref={root}>
      <PageHead
        a="Growth"
        b="reports"
        kpis={[
          { icon: <Users size={18} />, value: d.buyers, format: int, label: `Customers who bought, last ${n} months` },
          { icon: <Trophy size={18} />, value: d.won.length ? d.total / d.won.length : 0, format: zar, label: "Average job won" },
          { icon: <Clock3 size={18} />, value: d.cycle, format: int, label: "Days from enquiry to order" },
        ]}
        right={
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Seg label="Range" value={range} options={["3M", "6M", "12M"] as const} onChange={setRange} />
            <button className="btn gold" onClick={csv}><Download size={16} /> Export CSV</button>
          </div>
        }
      />
      <div className="rep">
        <Panel className="rep-seg" title="Revenue by industry"
          actions={<>
            <Seg label="Unit" value={mode} options={["R", "%"] as const} onChange={setMode} />
            <button className={"iconbtn sm " + (table ? "on" : "")} aria-pressed={table} aria-label="Show as table" onClick={() => setTable(!table)}><Table2 size={15} /></button>
          </>}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="big"><Count value={d.total} format={zar} /></span><span className="muted small">won, last {n} months</span>
          </div>
          <div className="legend" style={{ margin: "12px 0 10px" }}>
            {SEGMENTS.map((g) => <span className="it" key={g}><span className="sw" style={{ background: SEG_COLOR[g] }} />{g}<b>{zarK(d.segTotals[g] as number)}</b></span>)}
          </div>
          {table
            ? <DataTable head={["Month", ...SEGMENTS]} rows={d.bySeg.map((m) => [m.label, ...SEGMENTS.map((g) => zar(m.values[g] as number))])} />
            : <Stacked name="Revenue by industry per month" data={d.bySeg as { label: string; values: Record<string, number> }[]} keys={SEGMENTS} colors={SEG_COLOR} format={zar} axis={zarAxis} percent={mode === "%"} height={270} />}
        </Panel>
        <Panel className="rep-src" title="Where work comes from">
          <p className="small muted" style={{ marginBottom: 14 }}>Source of the {d.won.length} jobs won in the last {n} months.</p>
          <Donut name="Jobs won by source" data={d.src} center={String(d.won.length)} label="jobs won" />
          <ul style={{ display: "grid", gap: 9, marginTop: 18 }}>
            {d.src.map((x) => (
              <li key={x.key} className="small" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="sw" style={{ background: x.color }} />{x.key}<b className="tnum" style={{ marginLeft: "auto", fontWeight: 600 }}>{x.value}</b><span className="muted tnum" style={{ width: 38, textAlign: "right" }}>{d.won.length ? pct((x.value / d.won.length) * 100) : "0%"}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="rep-a" title="Jobs won per month"><Cols name="Jobs won per month" data={d.count} color="#4A90D9" format={int} height={190} /></Panel>
        <Panel className="rep-b" title="Win rate trend" sub="of closed quotes"><LineArea name="Win rate per month" data={d.rate} color="#2FA37A" format={pct} axis={pct} height={190} max={100} /></Panel>
        <Panel className="rep-c" title="Days to order by pump type"><div style={{ paddingTop: 6 }}><HBars data={d.byPump} color="#BF8632" format={(x) => `${Math.round(x)} days`} /></div></Panel>
        <Panel className="rep-d" title="Top customers"><div style={{ paddingTop: 6 }}><HBars data={d.top as { label: string; value: number }[]} color="#BF8632" format={zar} /></div></Panel>
      </div>
    </div>
  );
}
