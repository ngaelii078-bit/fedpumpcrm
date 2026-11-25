"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChartNoAxesColumn, Plus, Table2, Target, Trophy } from "lucide-react";
import { JOB_STAGES, MONTH_TARGET, STAGES, TEAM, probOf } from "@/lib/data";
import { ago, daysBetween, fmtDay, monthLabel, monthStart, pct, relDay, today, zar, zarAxis, zarK } from "@/lib/format";
import { inMonth, isOpen, nextRefurb, sum, useStore, winRate } from "@/lib/store";
import { Avatar, Count, Flange, PageHead, Panel, Seg, useEnter } from "@/components/ui/bits";
import { DataTable, LineArea } from "@/components/charts/charts";
import { DealCard } from "@/components/DealCard";

export default function Overview() {
  const { s, setOpen, customer } = useStore();
  const root = useEnter();
  const [range, setRange] = useState<"6M" | "12M">("12M");
  const [table, setTable] = useState(false);
  const now = new Date();

  const months = useMemo(() => {
    const n = range === "6M" ? 6 : 12;
    return Array.from({ length: n }, (_, i) => {
      const d = monthStart(new Date(), n - 1 - i);
      return { label: monthLabel(d), note: i === n - 1 ? "to date" : undefined, value: sum(s.deals.filter((x) => x.status === "won" && inMonth(x.closedAt, d))) };
    });
  }, [s.deals, range]);

  const open = s.deals.filter(isOpen);
  const wonMonth = sum(s.deals.filter((d) => d.status === "won" && inMonth(d.closedAt, now)));
  const total = months.reduce((a, m) => a + m.value, 0);
  const hit = months.filter((m) => m.value >= MONTH_TARGET).length;
  const hot = [...open].sort((a, b) => b.value * probOf(b.status) - a.value * probOf(a.status)).slice(0, 6);
  const bolts = Math.min(6, Math.floor(wonMonth / (MONTH_TARGET / 6)));
  const mix = STAGES.map((st) => {
    const ds = open.filter((d) => d.status === st.id);
    return { ...st, count: ds.length, value: sum(ds) };
  });
  const mixTotal = mix.reduce((a, m) => a + m.value, 0) || 1;
  /* shares that always add up to 100 */
  const share = (() => {
    const raw = mix.map((m) => (m.value / mixTotal) * 100);
    const out = raw.map(Math.floor);
    let left = 100 - out.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
      if (left-- > 0) out[i]++;
    });
    return out;
  })();
  const jobs = [...s.jobs].filter((j) => j.done < 6).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 5);
  const due = s.customers
    .flatMap((c) => c.pumps.map((p) => ({ c, p, next: nextRefurb(p), left: daysBetween(today(), nextRefurb(p)) })))
    .filter((x) => x.left <= 75)
    .sort((a, b) => a.left - b.left);

  return (
    <div ref={root}>
      <PageHead
        a="Sales"
        b="overview"
        kpis={[
          { icon: <Trophy size={18} />, value: wonMonth, format: zar, label: "Won this month", chip: <span className="chip gold">{pct((wonMonth / MONTH_TARGET) * 100)} of target</span> },
          { icon: <ChartNoAxesColumn size={18} />, value: sum(open), format: zar, label: "Open pipeline" },
          { icon: <Target size={18} />, value: winRate(s.deals), format: pct, label: "Win rate, last 12 months" },
        ]}
      />
      <div className="ov">
        <Panel
          className="ov-rev"
          title="Revenue won"
          actions={
            <>
              <Seg label="Range" value={range} options={["6M", "12M"] as const} onChange={setRange} />
              <button className={"iconbtn sm " + (table ? "on" : "")} aria-pressed={table} aria-label="Show as table" onClick={() => setTable(!table)}><Table2 size={15} /></button>
            </>
          }
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: "4px 12px", flexWrap: "wrap" }}>
            <span className="big"><Count value={total} format={zar} /></span>
            <span className="muted small">in {range === "6M" ? 6 : 12} months, {hit} at or above target</span>
          </div>
          <div className="small muted" style={{ display: "flex", gap: 18, margin: "8px 0 6px", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><i style={{ width: 14, height: 3, borderRadius: 3, background: "#D9A050" }} />Won revenue</span>
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><i style={{ width: 16, borderTop: "2px dashed rgba(243,240,233,.8)" }} />Monthly target {zarK(MONTH_TARGET)}</span>
          </div>
          {table
            ? <DataTable head={["Month", "Won", "Of target"]} rows={months.map((m) => [m.label, zar(m.value), pct((m.value / MONTH_TARGET) * 100)])} />
            : <LineArea name="Revenue won per month" data={months} target={MONTH_TARGET} color="#D9A050" format={zar} axis={zarAxis} height={232} />}
        </Panel>

        <Panel className="ov-hot" title="Hot quotes" sub="by weighted value"
          actions={<>
            <button className="iconbtn sm" aria-label="New enquiry" onClick={() => setOpen({ k: "newDeal" })}><Plus size={16} /></button>
            <Link className="iconbtn sm" href="/pipeline/" aria-label="Open pipeline"><ArrowUpRight size={16} /></Link>
          </>}>
          <div className="hotgrid">{hot.map((d) => <DealCard key={d.id} deal={d} showStage />)}</div>
        </Panel>

        <Panel className="ov-tgt tint" title="Month target">
          <div style={{ display: "grid", placeItems: "center", paddingTop: 4 }}>
            <Flange done={bolts} size={164}>
              <span className="display" style={{ fontSize: 25, fontWeight: 600 }}><Count value={(wonMonth / MONTH_TARGET) * 100} format={pct} /></span>
            </Flange>
          </div>
          <p className="small" style={{ textAlign: "center", marginTop: 12, color: "rgba(243,240,233,.88)" }}>
            {wonMonth >= MONTH_TARGET ? "Target met. All six bolts torqued." : `${zar(MONTH_TARGET - wonMonth)} to go. One bolt per ${zarK(MONTH_TARGET / 6)}.`}
          </p>
        </Panel>

        <Panel className="ov-mix" title="Stage mix" actions={<Link className="iconbtn sm" href="/pipeline/" aria-label="Open pipeline"><ArrowUpRight size={16} /></Link>}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span className="big"><Count value={mixTotal} format={zar} /></span>
            <span className="muted small">open across {open.length} quotes</span>
          </div>
          <div className="segbar" style={{ margin: "14px 0 12px" }} role="img" aria-label={mix.map((m, i) => `${m.name} ${share[i]}%`).join(", ")}>
            {mix.map((m, i) => {
              const p = (m.value / mixTotal) * 100;
              return <span key={m.id} style={{ width: `${p}%`, background: m.dot }} title={`${m.name}: ${zar(m.value)}`}>{p > 9 ? `${share[i]}%` : ""}</span>;
            })}
          </div>
          <ul style={{ display: "grid", gap: 7 }}>
            {mix.map((m) => (
              <li key={m.id} className="small" style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span className="sw" style={{ background: m.dot }} /><span>{m.name}</span><span className="dim">{m.count}</span>
                <b className="tnum" style={{ marginLeft: "auto", fontWeight: 600 }}>{zar(m.value)}</b>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="ov-floor" title="On the workshop floor" sub={`${s.jobs.filter((j) => j.done < 6).length} pumps`} actions={<Link className="iconbtn sm" href="/workshop/" aria-label="Open workshop"><ArrowUpRight size={16} /></Link>}>
          <ul style={{ display: "grid", gap: 4 }}>
            {jobs.map((j) => {
              const late = daysBetween(today(), j.due);
              return (
                <li key={j.id}>
                  <Link href={`/workshop/#${j.id}`} className="rowlink">
                    <Flange done={j.done} size={42} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="clip">{j.title}</span>
                      <span className="small muted clip">{customer(j.customerId)?.company}. {j.done ? `${JOB_STAGES[j.done]} next` : "Receive next"}</span>
                    </span>
                    <span className={late <= 1 ? "chip orange" : "chip ghost"}>{late <= 1 ? `Due ${relDay(j.due)}` : fmtDay(j.due)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel className="ov-due" title="Refurbs coming due" sub="next 75 days">
          <ul style={{ display: "grid", gap: 4 }}>
            {due.slice(0, 5).map(({ c, p, next, left }) => (
              <li key={p.tag} className="rowlink" style={{ cursor: "default" }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="mono clip">{p.tag}</span>
                  <span className="small muted clip">{c.company}. {left < 0 ? `Overdue since ${fmtDay(next)}` : `Due ${fmtDay(next)}`}</span>
                </span>
                <button className="btn sm" onClick={() => setOpen({ k: "newDeal", customerId: c.id, title: `Refurbish ${p.tag}`, pumpType: p.type })}>Quote</button>
              </li>
            ))}
          </ul>
          {due.length > 5 && <p className="small dim" style={{ padding: "8px 8px 0" }}>{due.length - 5} more in the pump registers</p>}
        </Panel>

        <Panel className="ov-act" title="Activity">
          <ul style={{ display: "grid", gap: 13 }}>
            {s.activity.slice(0, 6).map((a) => (
              <li key={a.id} style={{ display: "flex", gap: 11 }}>
                <Avatar id={a.who} size={28} />
                <div className="small" style={{ lineHeight: 1.4, minWidth: 0 }}>
                  <b style={{ fontWeight: 600 }}>{TEAM.find((t) => t.id === a.who)?.name}</b> <span className="muted">{a.text}</span>
                  <div className="dim" style={{ fontSize: 12 }}>{ago(a.at)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
