"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, Factory, MessageCircle, Siren, Timer, Wrench } from "lucide-react";
import { JOB_STAGES, MACHINES } from "@/lib/data";
import { daysBetween, fmtDay, int, relDay, today, zar } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Empty, Flange, PageHead, Panel, useEnter } from "@/components/ui/bits";
import { PUMPS } from "@/lib/pumps";
import type { Condition } from "@/lib/types";
import { COND, PumpSection, useStrip } from "./PumpSection";

const CondTag = ({ c }: { c: Condition }) => (
  <span className="cond" style={{ color: COND[c].color }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={COND[c].icon} /></svg>
    {COND[c].name}
  </span>
);

export default function Workshop() {
  const { s, customer, dispatch, toast, setOpen } = useStore();
  const root = useEnter();
  const jobs = useMemo(() => [...s.jobs].sort((a, b) => Number(a.done === 6) - Number(b.done === 6) || a.due.localeCompare(b.due)), [s.jobs]);
  const [id, setId] = useState<string>(() => jobs[0]?.id ?? "");
  const [active, setActive] = useState<string | null>(null);
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  const strip = useStrip(job?.id ?? "");

  useEffect(() => {
    const f = () => {
      const h = window.location.hash.slice(1);
      if (h && s.jobs.some((j) => j.id === h)) setId(h);
    };
    f();
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const t = today();
  const live = jobs.filter((j) => j.done < 6);
  if (!job) return <div ref={root}><Empty>No jobs on the floor.</Empty></div>;
  const c = customer(job.customerId);
  const deal = s.deals.find((d) => d.id === job.dealId);
  const defs = PUMPS[job.pumpType];
  const counts = (["reuse", "recondition", "replace"] as Condition[]).map((k) => ({ k, n: job.parts.filter((p) => p.condition === k).length }));
  const act = (() => {
    const p = defs.find((x) => x.id === active);
    const jp = job.parts.find((x) => x.id === active);
    return p && jp ? { p, jp } : null;
  })();
  const waiting = deal && deal.status !== "won" && job.done >= 3;
  const next = JOB_STAGES[job.done];

  return (
    <div ref={root}>
      <PageHead
        a="Workshop"
        b="floor"
        kpis={[
          { icon: <Factory size={18} />, value: live.length, format: int, label: "Pumps on the floor" },
          { icon: <Timer size={18} />, value: live.filter((j) => daysBetween(t, j.due) <= 7).length, format: int, label: "Due in the next 7 days" },
          { icon: <Siren size={18} />, value: live.filter((j) => j.urgency === "breakdown").length, format: int, label: "Breakdowns", chip: <span className="chip orange">Work first</span> },
        ]}
      />
      <div className="floor">
        <div className="joblist" data-enter data-lenis-prevent>
          {jobs.map((j) => {
            const left = daysBetween(t, j.due);
            return (
              <button key={j.id} className="job" aria-pressed={j.id === job.id} onClick={() => { setId(j.id); setActive(null); }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/photos/${j.photo}.webp`} alt="" width={56} height={56} loading="lazy" />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="small muted" style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="mono">{j.id}</span>{j.urgency === "breakdown" && <Siren size={13} color="#ffb59f" aria-label="Breakdown" />}</span>
                  <span className="clip" style={{ fontWeight: 600 }}>{j.title}</span>
                  <span className="small muted clip">{j.done === 6 ? "Handed over" : left < 0 ? "Past due" : `Due ${left <= 1 ? relDay(j.due) : fmtDay(j.due)}`}, {customer(j.customerId)?.company}</span>
                </span>
                <Flange done={j.done} size={40} />
              </button>
            );
          })}
        </div>

        <div className="panel" data-enter style={{ padding: 18 }}>
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 14 }}>
            <Flange key={job.id} done={job.done} size={66}><span className="display" style={{ fontSize: 15, fontWeight: 700 }}>{job.done}</span></Flange>
            <div style={{ flex: "1 1 240px", minWidth: 0 }}>
              <div className="small muted"><span className="mono">{job.id}</span>, {job.pumpType}, on the {job.machine.toLowerCase()}</div>
              <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{job.title}</h2>
              <button className="small muted" style={{ textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "var(--line-2)" }} onClick={() => setOpen({ k: "customer", id: c.id })}>{c.company}, {c.town}</button>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              <button className="btn" onClick={() => setOpen({ k: "message", customerId: c.id, channel: "WhatsApp", text: `Good day ${c.contact.split(" ")[0]}, progress on ${job.id}, your ${job.title.toLowerCase()}: ${job.done} of 6 stages signed off${next ? `, ${next === "QC & handover" ? "final QC" : next.toLowerCase()} is next` : ""}. ${counts[0].n} components reused, ${counts[1].n} reconditioned, ${counts[2].n} replaced. ${job.done === 6 ? "Ready to collect." : `On track for ${fmtDay(job.due)}.`} Fedpump, Boksburg` })}><MessageCircle size={16} /> Send update</button>
              <button className="btn gold" disabled={job.done >= 6 || !!waiting} onClick={() => {
                dispatch({ t: "advance", id: job.id });
                toast(job.done === 5 ? `${job.id} handed over. Invoice sent to ${c.company}.` : `${next} signed off on ${job.id}.`);
              }}>{job.done >= 6 ? <><Check size={16} /> Handed over</> : waiting ? "Waiting for order" : <><Wrench size={16} /> {job.done === 5 ? "Sign off QC and hand over" : `Sign off ${next.toLowerCase()}`}</>}</button>
            </div>
          </div>

          <div className="drawing">
            <div className="gridbg" aria-hidden="true" />
            <PumpSection job={job} t={strip.t} active={active} onActive={setActive} />
            <div className="dcap" aria-live="polite">
              {act ? (
                <><span className="mono muted">Fig {act.p.fig}</span><b style={{ fontWeight: 600 }}>{act.p.name}</b><span className="muted">{act.jp.note}</span><CondTag c={act.jp.condition} /></>
              ) : (
                <span className="muted">Drag to strip the pump. Pick a part to see the finding.</span>
              )}
            </div>
            <div style={{ position: "relative", padding: "0 20px 14px", display: "flex", alignItems: "center", gap: 14 }}>
              <button className="small muted" onClick={() => strip.play(0)} style={{ whiteSpace: "nowrap" }}>Assembled</button>
              <input className="strip" type="range" min={0} max={1000} value={Math.round(strip.t * 1000)} onChange={(e) => strip.set(Number(e.target.value) / 1000)} style={{ ["--p" as string]: `${strip.t * 100}%` }} aria-label="Strip the pump" aria-valuetext={`${Math.round(strip.t * 100)}% stripped`} />
              <button className="small muted" onClick={() => strip.play(1)} style={{ whiteSpace: "nowrap" }}>Stripped</button>
            </div>
          </div>
          <div className="legend" style={{ margin: "12px 0 16px" }}>
            {counts.map(({ k, n }) => <span className="it" key={k}><CondTag c={k} /><b>{n}</b></span>)}
          </div>

          <div className="steps" style={{ marginBottom: 18 }}>
            {JOB_STAGES.map((x, i) => <div key={x} className={i < job.done ? "done" : i === job.done ? "next" : ""}>{x}{i < job.done && <span className="sr"> signed off</span>}</div>)}
          </div>

          <div className="scrollx">
            <table className="tbl" style={{ minWidth: 560 }}>
              <thead><tr><th>Fig</th><th>Component</th><th>Finding</th><th>Action</th></tr></thead>
              <tbody>
                {defs.map((p) => {
                  const jp = job.parts.find((x) => x.id === p.id)!;
                  return (
                    <tr key={p.id} onPointerEnter={() => setActive(p.id)} onPointerLeave={() => setActive(null)} style={active === p.id ? { background: "rgba(243,240,233,.08)" } : undefined}>
                      <td className="mono muted">{p.fig}</td><td style={{ fontWeight: 500 }}>{p.name}</td><td className="muted">{jp.note}</td><td><CondTag c={jp.condition} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="small muted" style={{ display: "flex", gap: "6px 22px", flexWrap: "wrap", paddingTop: 14 }}>
            <span>Job value <b style={{ color: "var(--ink)", fontWeight: 600 }}>{deal ? zar(deal.value) : ""}</b> excl. VAT</span>
            <span>Due <b style={{ color: "var(--ink)", fontWeight: 600 }}>{fmtDay(job.due)}</b>, {relDay(job.due)}</span>
            {deal && deal.status !== "won" && <span>Quote <button style={{ color: "var(--ink)", textDecoration: "underline" }} onClick={() => setOpen({ k: "deal", id: deal.id })}>{deal.id}</button> is still open</span>}
          </div>
        </div>
      </div>

      <div className="machines">
        {MACHINES.map((m) => {
          const p = m.hours / m.cap;
          const on = live.filter((j) => j.machine === m.name);
          return (
            <Panel key={m.name} title={m.name}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span className="big" style={{ fontSize: 24 }}>{Math.round(p * 100)}%</span><span className="small muted">{m.hours} of {m.cap} h booked</span></div>
              <div className={"meter" + (p > 0.9 ? " hot" : "")} style={{ margin: "12px 0 10px" }}><i style={{ width: `${p * 100}%` }} /></div>
              <div className="small muted">{on.length ? on.map((j) => j.id).join(", ") : "Nothing queued"}</div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
