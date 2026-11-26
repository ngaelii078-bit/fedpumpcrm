"use client";
import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardList, Clock3, MessageCircle, PackageCheck, Siren } from "lucide-react";
import { JOB_STAGES } from "@/lib/data";
import { daysBetween, fmtDay, int, relDay, today, zar } from "@/lib/format";
import { useStore } from "@/lib/store";
import { Empty, Flange, PageHead, Panel, useEnter } from "@/components/ui/bits";

export default function Workshop() {
  const { s, customer, dispatch, toast, setOpen } = useStore();
  const root = useEnter();
  const jobs = useMemo(() => [...s.jobs].sort((a, b) => Number(a.done === 6) - Number(b.done === 6) || a.due.localeCompare(b.due)), [s.jobs]);
  const [id, setId] = useState(() => jobs[0]?.id ?? "");
  const job = jobs.find((j) => j.id === id) ?? jobs[0];
  useEffect(() => {
    const select = () => {
      const hash = window.location.hash.slice(1);
      if (hash && s.jobs.some((j) => j.id === hash)) setId(hash);
    };
    select();
    window.addEventListener("hashchange", select);
    return () => window.removeEventListener("hashchange", select);
  }, [s.jobs]);

  const live = jobs.filter((j) => j.done < 6);
  const t = today();
  const c = job && customer(job.customerId);
  const deal = job && s.deals.find((d) => d.id === job.dealId);
  const next = job && JOB_STAGES[job.done];
  const waiting = job && deal && deal.status !== "won" && job.done >= 3;

  return (
    <div ref={root}>
      <PageHead a="Workshop" b="jobs" kpis={[
        { icon: <ClipboardList size={18} />, value: live.length, format: int, label: "Active jobs" },
        { icon: <Clock3 size={18} />, value: live.filter((j) => daysBetween(t, j.due) <= 7).length, format: int, label: "Due in the next 7 days" },
        { icon: <Siren size={18} />, value: live.filter((j) => j.urgency === "breakdown").length, format: int, label: "Priority jobs" },
      ]} />
      {!job || !c ? <Panel title="Workshop jobs"><Empty>No jobs yet. Mark a pipeline opportunity won to start a workshop job.</Empty></Panel> : (
        <div className="floor">
          <div className="joblist" data-enter data-lenis-prevent>
            {jobs.map((j) => {
              const left = daysBetween(t, j.due);
              return <button key={j.id} className="job" aria-pressed={j.id === job.id} onClick={() => setId(j.id)}>
                <span style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: "var(--well)" }}><PackageCheck size={21} /></span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="small muted mono">{j.id}</span>
                  <span className="clip" style={{ fontWeight: 600 }}>{j.title}</span>
                  <span className="small muted clip">{j.done === 6 ? "Completed" : left < 0 ? "Past due" : `Due ${left <= 1 ? relDay(j.due) : fmtDay(j.due)}`}, {customer(j.customerId)?.company}</span>
                </span>
                <Flange done={j.done} size={40} />
              </button>;
            })}
          </div>
          <div className="panel" data-enter style={{ padding: 22 }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
              <Flange key={job.id} done={job.done} size={66}><span className="display" style={{ fontSize: 15, fontWeight: 700 }}>{job.done}</span></Flange>
              <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                <div className="small muted"><span className="mono">{job.id}</span> · {job.pumpType}</div>
                <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{job.title}</h2>
                <button className="small muted" style={{ textDecoration: "underline", textUnderlineOffset: 3 }} onClick={() => setOpen({ k: "customer", id: c.id })}>{c.company}, {c.town}</button>
              </div>
              <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
                <button className="btn" onClick={() => setOpen({ k: "message", customerId: c.id, channel: "WhatsApp", text: `Good day ${c.contact.split(" ")[0]}, here is an update on ${job.title}: ${job.done} of 6 workshop stages are complete${next ? `, with ${next.toLowerCase()} next` : ""}. ${job.done === 6 ? "The job is complete." : `The planned date is ${fmtDay(job.due)}.`} Rebotech` })}><MessageCircle size={16} /> Draft update</button>
                <button className="btn gold" disabled={job.done >= 6 || !!waiting} onClick={() => { dispatch({ t: "advance", id: job.id }); toast(job.done === 5 ? `${job.id} completed in the demo.` : `${next} recorded on ${job.id}.`); }}>
                  {job.done >= 6 ? <><Check size={16} /> Completed</> : waiting ? "Waiting for order" : <><Check size={16} /> Complete {next?.toLowerCase()}</>}
                </button>
              </div>
            </div>
            <div style={{ background: "var(--well)", borderRadius: 18, padding: 20, marginBottom: 20 }}>
              <p className="small muted" style={{ marginBottom: 8 }}>WORKSHOP PROGRESS</p>
              <h3 style={{ fontSize: 20, fontWeight: 600 }}>{job.done === 6 ? "Job completed" : `${next} is next`}</h3>
              <p className="muted small" style={{ marginTop: 8 }}>Track each step from the initial requirements to the agreed handover. This demo records progress locally.</p>
              <div className="meter" style={{ marginTop: 18 }}><i style={{ width: `${job.done / 6 * 100}%` }} /></div>
              <div className="steps" style={{ marginTop: 18 }}>
                {JOB_STAGES.map((stage, i) => <div key={stage} className={i < job.done ? "done" : i === job.done ? "next" : ""}>{stage}{i < job.done && <span className="sr"> completed</span>}</div>)}
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
              <div style={{ display: "grid", gap: 5, background: "var(--well)", borderRadius: 12, padding: 14 }}><span className="small muted">Service category</span><b>{job.pumpType}</b></div>
              <div style={{ display: "grid", gap: 5, background: "var(--well)", borderRadius: 12, padding: 14 }}><span className="small muted">Work area</span><b>{job.machine}</b></div>
              <div style={{ display: "grid", gap: 5, background: "var(--well)", borderRadius: 12, padding: 14 }}><span className="small muted">Planned date</span><b>{fmtDay(job.due)}</b></div>
              <div style={{ display: "grid", gap: 5, background: "var(--well)", borderRadius: 12, padding: 14 }}><span className="small muted">Opportunity value, excl. VAT</span><b>{deal ? zar(deal.value) : "—"}</b></div>
            </div>
            {waiting && <p className="small muted" style={{ marginTop: 16 }}>This job is awaiting the customer order before workshop work continues.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
