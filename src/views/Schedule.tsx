"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, Siren, Truck } from "lucide-react";
import { EVENT_KINDS, TEAM } from "@/lib/data";
import { addDays, dayName, fmtDay, fmtLong, hhmm, int, iso, mondayOf, today } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { EventKind } from "@/lib/types";
import { Avatar, Empty, PageHead, Panel, Seg, reduced, useEnter } from "@/components/ui/bits";

const TONE: Record<EventKind, { k: string; bg: string }> = {
  "Site visit": { k: "#8FC1EE", bg: "rgba(58,92,124,.78)" },
  Collection: { k: "#EDB771", bg: "rgba(122,90,44,.8)" },
  Inspection: { k: "#D9DDE0", bg: "rgba(108,113,117,.6)" },
  Delivery: { k: "#79CFA8", bg: "rgba(38,96,74,.75)" },
  "Call-out": { k: "#FF9A7C", bg: "rgba(138,60,38,.82)" },
};

export default function Schedule() {
  const { s, setOpen, customer } = useStore();
  const root = useEnter();
  const [off, setOff] = useState(0);
  const [span, setSpan] = useState<"Day" | "24h">("Day");
  const [kinds, setKinds] = useState<EventKind[]>([]);
  const [now, setNow] = useState(() => new Date());
  const lanes = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const mon = addDays(mondayOf(now), off * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
  const [h0, h1] = span === "Day" ? [6, 21] : [0, 24];
  const px = 46;
  const list = useMemo(() => s.events.filter((e) => !kinds.length || kinds.includes(e.kind)), [s.events, kinds]);
  const t = today();
  const todays = s.events.filter((e) => e.date === t).sort((a, b) => a.start - b.start);
  const inWeek = s.events.filter((e) => e.date >= iso(days[0]) && e.date <= iso(days[6]));
  const nowH = now.getHours() + now.getMinutes() / 60;

  useEffect(() => {
    if (reduced() || !lanes.current) return;
    gsap.fromTo(lanes.current.querySelectorAll(".ev"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out", stagger: 0.025, clearProps: "transform,opacity" });
  }, [off, span, kinds]);

  return (
    <div ref={root}>
      <PageHead
        a="Job"
        b="schedule"
        kpis={[
          { icon: <CalendarCheck size={18} />, value: inWeek.length, format: int, label: "Booked this week" },
          { icon: <Truck size={18} />, value: inWeek.filter((e) => e.kind === "Collection" || e.kind === "Delivery").length, format: int, label: "Collections and deliveries" },
          { icon: <Siren size={18} />, value: inWeek.filter((e) => e.kind === "Call-out").length, format: int, label: "Call-outs", chip: <span className="chip gold">Open 24 hours</span> },
        ]}
      />
      <div className="toolbar" data-enter>
        <button className="iconbtn" aria-label="Previous week" onClick={() => setOff(off - 1)}><ChevronLeft size={17} /></button>
        <button className="btn" onClick={() => setOff(0)} disabled={off === 0}>This week</button>
        <button className="iconbtn" aria-label="Next week" onClick={() => setOff(off + 1)}><ChevronRight size={17} /></button>
        <span className="display" style={{ fontWeight: 600, fontSize: 16, margin: "0 8px" }}>{fmtDay(iso(days[0]))} to {fmtDay(iso(days[6]))}</span>
        {EVENT_KINDS.map((k) => (
          <button key={k} className="tag" aria-pressed={kinds.includes(k)} onClick={() => setKinds((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]))}>
            <span className="sw" style={{ background: TONE[k].k }} />{k}
          </button>
        ))}
        <span className="grow" />
        <Seg label="Hours shown" value={span} options={[{ v: "Day", l: "06 to 21" }, { v: "24h", l: "24 h" }] as const} onChange={setSpan} />
        <button className="btn gold" onClick={() => setOpen({ k: "newEvent" })}><Plus size={16} /> Book a slot</button>
      </div>
      <div className="schedgrid">
        <div className="panel scrollx" data-enter style={{ padding: "16px 12px 14px 6px" }}>
          <div className="cal" ref={lanes}>
            <span />
            {days.map((d) => (
              <div key={iso(d)} className={"dh" + (iso(d) === t ? " now" : "")}><b>{d.getDate()}</b>{dayName(d)}</div>
            ))}
            <div className="tm" style={{ height: (h1 - h0) * px }}>
              {Array.from({ length: h1 - h0 }, (_, i) => (i ? <span key={i} style={{ top: i * px }}>{hhmm(h0 + i)}</span> : null))}
            </div>
            {days.map((d) => {
              const key = iso(d);
              const evs = list.filter((e) => e.date === key && e.start < h1 && e.start + e.hours > h0);
              return (
                <div key={key} className="lane" style={{ height: (h1 - h0) * px }}>
                  {Array.from({ length: h1 - h0 }, (_, i) => (
                    <div key={i}>
                      <span className="hr" style={{ top: i * px }} />
                      <button className="cell" tabIndex={-1} style={{ top: i * px + 1, height: px - 2 }} aria-label={`Book ${fmtLong(key)} at ${hhmm(h0 + i)}`} onClick={() => setOpen({ k: "newEvent", date: key, start: h0 + i })}><Plus size={14} style={{ margin: "0 auto" }} className="muted" /></button>
                    </div>
                  ))}
                  {evs.map((e) => {
                    const top = Math.max(0, (e.start - h0) * px) + 2;
                    const h = Math.max(38, e.hours * px - 4);
                    return (
                      <button key={e.id} className="ev" style={{ top, height: h, background: TONE[e.kind].bg, ["--k" as string]: TONE[e.kind].k }} onClick={() => setOpen({ k: "customer", id: e.customerId })}
                        title={`${e.kind}: ${e.title}. ${customer(e.customerId)?.company}, ${hhmm(e.start)} to ${hhmm(e.start + e.hours)}`}>
                        <b style={{ display: "-webkit-box", WebkitLineClamp: h < 60 ? 1 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{e.title}</b>
                        {h >= 60 && <span style={{ color: "rgba(243,240,233,.85)" }}>{hhmm(e.start)}, {TEAM.find((x) => x.id === e.who)?.name}</span>}
                      </button>
                    );
                  })}
                  {key === t && nowH > h0 && nowH < h1 && <span className="nowline" style={{ top: (nowH - h0) * px }} />}
                </div>
              );
            })}
          </div>
        </div>
        <Panel title="Today" sub={fmtLong(t)}>
          {todays.length === 0 && <Empty>Nothing booked today. The workshop is still open all night.</Empty>}
          <ul style={{ display: "grid", gap: 10, marginTop: 4 }}>
            {todays.map((e) => (
              <li key={e.id}>
                <button onClick={() => setOpen({ k: "customer", id: e.customerId })} style={{ width: "100%", textAlign: "left", background: "var(--well)", borderRadius: 14, padding: 13, display: "grid", gap: 5 }}>
                  <span className="small" style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="sw" style={{ background: TONE[e.kind].k }} />{e.kind}<span className="muted tnum" style={{ marginLeft: "auto" }}>{hhmm(e.start)} to {hhmm(e.start + e.hours)}</span></span>
                  <b style={{ fontWeight: 600 }}>{e.title}</b>
                  <span className="small muted" style={{ display: "flex", alignItems: "center", gap: 8 }}><Avatar id={e.who} size={22} />{customer(e.customerId)?.company}, {customer(e.customerId)?.town}</span>
                </button>
              </li>
            ))}
          </ul>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: "20px 0 8px" }}>Coming up</h3>
          <ul style={{ display: "grid", gap: 9 }}>
            {s.events.filter((e) => e.date > t).sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start).slice(0, 4).map((e) => (
              <li key={e.id} className="small" style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                <span className="sw" style={{ background: TONE[e.kind].k, translate: "0 1px" }} />
                <span style={{ flex: 1 }}>{e.title}<span className="muted" style={{ display: "block" }}>{customer(e.customerId)?.company}</span></span>
                <span className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDay(e.date)}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
