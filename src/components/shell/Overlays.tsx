"use client";
import { FormEvent, ReactNode, RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { CalendarPlus, Check, Factory, FileText, Mail, MessageCircle, Phone, Search, Siren, Star, User, Wrench, X } from "lucide-react";
import { EVENT_KINDS, ME, PUMP_TYPES, SEGMENTS, SERVICES, STAGES, TEAM, probOf, stageOf } from "@/lib/data";
import { ago, daysBetween, fmtDay, fmtFull, fmtSoon, relDay, today, zar, zarK } from "@/lib/format";
import { VAT, isOpen, nextRefurb, sum, useStore } from "@/lib/store";
import { AUDIENCES, buildAudience, stepsFor } from "@/lib/outreach";
import { Paper } from "@/views/OutreachBits";
import type { AudienceKey, CalEvent, Campaign, Customer, Deal, EventKind, PumpType, Segment, Service, Source, Urgency } from "@/lib/types";
import { Avatar, Avatars, Empty, Initials, reduced, useIso } from "../ui/bits";
import { lenisStop } from "./lenis";

/* focus, escape, scroll lock and motion for every overlay */
function useDialog(ref: RefObject<HTMLElement | null>, close: () => void, from: gsap.TweenVars) {
  const closing = useRef(false);
  const leave = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    const el = ref.current;
    if (!el || reduced()) return close();
    gsap.to(el, { ...from, duration: 0.24, ease: "power3.out", onComplete: close });
  }, [close, from, ref]);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    const back = document.activeElement as HTMLElement | null;
    if (!reduced()) gsap.from(el, { ...from, duration: 0.5, ease: "power3.out", clearProps: "transform,opacity" });
    const focusables = () => [...el.querySelectorAll<HTMLElement>("button,a[href],input,select,textarea,[tabindex='0']")].filter((x) => !x.hasAttribute("disabled"));
    (el.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        leave();
      }
      if (e.key === "Tab") {
        const f = focusables();
        if (!f.length) return;
        if (e.shiftKey && document.activeElement === f[0]) {
          e.preventDefault();
          f[f.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
          e.preventDefault();
          f[0].focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    lenisStop(true);
    return () => {
      document.removeEventListener("keydown", key);
      lenisStop(false);
      back?.focus?.({ preventScroll: true });
    };
  }, []);
  return leave;
}

const SLIDE = { x: 46, opacity: 0 };
const RISE = { y: 18, opacity: 0 };

function Drawer({ label, children, footer, head, onClose }: { label: string; head: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const leave = useDialog(ref, onClose, SLIDE);
  return (
    <>
      <div className="scrim" onClick={leave} />
      <div className="drawer" ref={ref} role="dialog" aria-modal="true" aria-label={label}>
        <div className="hd">
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>{head}</div>
          <button className="iconbtn sm" onClick={leave} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="bd" data-lenis-prevent>{children}</div>
        {footer && <div className="act">{footer}</div>}
      </div>
    </>
  );
}

function Modal({ label, children, onClose, top, wide }: { label: string; children: (leave: () => void) => ReactNode; onClose: () => void; top?: boolean; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const leave = useDialog(ref, onClose, RISE);
  return (
    <>
      <div className="scrim" onClick={leave} />
      <div className={"modal" + (top ? " top" : "") + (wide ? " wide" : "")} ref={ref} role="dialog" aria-modal="true" aria-label={label} data-lenis-prevent>{children(leave)}</div>
    </>
  );
}

const H = ({ children, leave }: { children: ReactNode; leave: () => void }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <h2 style={{ fontSize: 20, fontWeight: 600, marginRight: "auto" }}>{children}</h2>
    <button className="iconbtn sm" type="button" onClick={leave} aria-label="Close"><X size={16} /></button>
  </div>
);

const Sub = ({ children }: { children: ReactNode }) => <h3 style={{ fontSize: 14, fontWeight: 600, margin: "22px 0 10px" }}>{children}</h3>;

function Feed({ list }: { list: { id: string; who: string; text: string; at: number }[] }) {
  if (!list.length) return <Empty>No activity logged yet.</Empty>;
  return (
    <ul style={{ display: "grid", gap: 12 }}>
      {list.map((a) => (
        <li key={a.id} style={{ display: "flex", gap: 10 }}>
          <Avatar id={a.who} size={26} />
          <div className="small" style={{ lineHeight: 1.4 }}>
            <b style={{ fontWeight: 600 }}>{TEAM.find((t) => t.id === a.who)?.name}</b> <span className="muted">{a.text}</span>
            <div className="dim" style={{ fontSize: 12 }}>{ago(a.at)}</div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- deal ---------------- */
function DealDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { s, customer, moveDeal, setOpen } = useStore();
  const d = s.deals.find((x) => x.id === id);
  if (!d) return null;
  const c = customer(d.customerId);
  const job = s.jobs.find((j) => j.dealId === d.id);
  const idx = STAGES.findIndex((x) => x.id === d.status);
  const closed = !isOpen(d);
  const rows: [string, ReactNode][] = [
    ["Service", d.service],
    ["Scope", d.pumpType],
    [closed ? "Closed" : "Expected close", closed ? fmtFull(d.closedAt!) : `${fmtFull(d.closes)}, ${relDay(d.closes)}`],
    ["Logged", fmtFull(d.created)],
    ["Came in through", d.source],
    ["Weighted value", zar(d.value * probOf(d.status))],
  ];
  return (
    <Drawer
      label={d.title}
      onClose={onClose}
      head={
        <>
          <span className="mono muted">{d.id}</span>
          {d.urgency === "breakdown" && <span className="chip orange">Urgent</span>}
          {d.urgency === "shutdown" && <span className="chip blue">Project deadline</span>}
          {d.status === "won" && <span className="chip green">Won</span>}
          {d.status === "lost" && <span className="chip ghost">Lost</span>}
        </>
      }
      footer={
        <>
          <button className="btn sm" onClick={() => setOpen({ k: "message", customerId: c.id, channel: "WhatsApp", text: `Good day ${c.contact.split(" ")[0]}, following up on ${d.id}, ${d.title}. Is there anything you still need from us?` })}><MessageCircle size={15} /> WhatsApp</button>
          <button className="btn sm" onClick={() => setOpen({ k: "call", customerId: c.id })}><Phone size={15} /> Log call</button>
          <span style={{ flex: 1 }} />
          {!closed && <button className="btn sm" onClick={() => moveDeal(d.id, "lost")}>Lost</button>}
          {!closed && <button className="btn sm gold" onClick={() => moveDeal(d.id, "won")}><Check size={15} /> Won</button>}
          {closed && <button className="btn sm" onClick={() => moveDeal(d.id, "po")}>Reopen</button>}
        </>
      }
    >
      <h2 style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>{d.title}</h2>
      <button className="muted" style={{ textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: "var(--line-2)", marginTop: 4 }} onClick={() => setOpen({ k: "customer", id: c.id })}>{c.company}, {c.town}</button>
      <div className="big" style={{ margin: "16px 0 4px", fontSize: 34 }}>{zar(d.value)}</div>
      <div className="muted small">excluding VAT</div>
      <Sub>Stage</Sub>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6 }}>
        {STAGES.map((st, i) => (
          <button key={st.id} onClick={() => moveDeal(d.id, st.id)} aria-pressed={d.status === st.id}
            style={{ textAlign: "left", fontSize: 12, paddingTop: 9, borderTop: `3px solid ${(closed && d.status === "won") || i <= idx ? st.dot : "var(--line-2)"}`, color: i === idx ? "var(--ink)" : "var(--ink-2)", fontWeight: i === idx ? 600 : 400 }}>
            {st.name}
          </button>
        ))}
      </div>
      <Sub>Details</Sub>
      <dl style={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: 9, fontSize: 13.5 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}><dt className="muted">{k}</dt><dd>{v}</dd></div>
        ))}
        <dt className="muted">Owners</dt>
        <dd style={{ paddingLeft: 7 }}><Avatars ids={d.owners} /></dd>
      </dl>
      {job && (
        <>
          <Sub>Workshop job</Sub>
          <div className="panel" style={{ padding: 14, display: "flex", gap: 12, alignItems: "center" }}>
            <Wrench size={18} className="muted" />
            <div><b className="mono" style={{ fontWeight: 500 }}>{job.id}</b><div className="small muted">{job.done} of 6 stages signed off, due {fmtDay(job.due)}</div></div>
          </div>
        </>
      )}
      <Sub>Activity</Sub>
      <Feed list={s.activity.filter((a) => a.dealId === d.id || a.customerId === c.id).slice(0, 6)} />
    </Drawer>
  );
}

/* ---------------- customer ---------------- */
function CustomerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const { s, dispatch, setOpen } = useStore();
  const c = s.customers.find((x) => x.id === id);
  if (!c) return null;
  const deals = s.deals.filter((d) => d.customerId === id);
  const open = deals.filter(isOpen);
  const owing = s.invoices.filter((i) => i.customerId === id && (i.status === "Sent" || i.status === "Overdue")).reduce((a, i) => a + i.amount * VAT, 0);
  return (
    <Drawer
      label={c.company}
      onClose={onClose}
      head={<><span className="chip ghost">{c.segment}</span><span className="small muted">{c.town}</span></>}
      footer={
        <>
          <button className="btn sm" onClick={() => setOpen({ k: "message", customerId: id, channel: "WhatsApp", text: `Good day ${c.contact.split(" ")[0]}, ` })}><MessageCircle size={15} /> WhatsApp</button>
          <button className="btn sm" onClick={() => setOpen({ k: "message", customerId: id, channel: "Email", text: `Good day ${c.contact.split(" ")[0]},\n\n` })}><Mail size={15} /> Email</button>
          <button className="btn sm" onClick={() => setOpen({ k: "call", customerId: id })}><Phone size={15} /> Log call</button>
          <span style={{ flex: 1 }} />
          <button className="btn sm gold" onClick={() => setOpen({ k: "newDeal", customerId: id })}>New enquiry</button>
        </>
      }
    >
      <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
        <Initials name={c.contact} segment={c.segment} size={54} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.15 }}>{c.contact}</h2>
          <div className="muted">{c.role}, {c.company}</div>
        </div>
        <button className={"iconbtn " + (c.starred ? "on" : "")} aria-pressed={c.starred} aria-label="Star customer" onClick={() => dispatch({ t: "star", id })}><Star size={16} fill={c.starred ? "currentColor" : "none"} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 18 }}>
        {[["Open quotes", zarK(sum(open))], ["Won to date", zarK(sum(deals.filter((d) => d.status === "won")))], ["Owing, incl. VAT", zarK(owing)]].map(([k, v]) => (
          <div key={k} style={{ background: "var(--well)", borderRadius: 13, padding: "10px 12px" }}>
            <div className="small muted">{k}</div><div className="display" style={{ fontWeight: 600, fontSize: 17 }}>{v}</div>
          </div>
        ))}
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "110px 1fr", rowGap: 8, fontSize: 13.5, marginTop: 18 }}>
        <dt className="muted">Phone</dt><dd className="mono">{c.phone}</dd>
        <dt className="muted">Email</dt><dd style={{ overflowWrap: "anywhere" }}>{c.email}</dd>
        <dt className="muted">Last contact</dt><dd>{relDay(c.lastContact)}</dd>
        <dt className="muted">Customer since</dt><dd>{fmtFull(c.since)}</dd>
        <dt className="muted">Outreach email</dt>
        <dd style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {c.optOut ? "Off the list" : "Allowed"}
          <button className="btn sm" style={{ height: 28 }} onClick={() => dispatch({ t: "optOut", id, on: !c.optOut })}>{c.optOut ? "Allow again" : "Take off list"}</button>
        </dd>
      </dl>
      <Sub>Service reviews</Sub>
      {c.pumps.length === 0 && <Empty>No service reviews on record yet.</Empty>}
      <ul style={{ display: "grid", gap: 9 }}>
        {c.pumps.map((p) => {
          const next = nextRefurb(p);
          const used = Math.min(1, daysBetween(p.lastRefurb, today()) / Math.max(1, daysBetween(p.lastRefurb, next)));
          const left = daysBetween(today(), next);
          return (
            <li key={p.tag} style={{ background: "var(--well)", borderRadius: 13, padding: "11px 13px" }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 0 }}><div className="mono">{p.tag}</div><div className="small muted">{p.type}. {p.desc}</div></div>
                <button className="btn sm" onClick={() => setOpen({ k: "newDeal", customerId: id, title: `Review ${p.tag}`, pumpType: p.type })}>New enquiry</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                <span className={"meter" + (left < 30 ? " hot" : "")}><i style={{ width: `${used * 100}%` }} /></span>
                <span className="small muted" style={{ whiteSpace: "nowrap" }}>{left < 0 ? "Review overdue" : `Due ${fmtSoon(next)}`}</span>
              </div>
            </li>
          );
        })}
      </ul>
      <Sub>Open quotes</Sub>
      {open.length === 0 && <Empty>Nothing open right now.</Empty>}
      <ul style={{ display: "grid", gap: 8 }}>
        {open.map((d) => (
          <li key={d.id}>
            <button onClick={() => setOpen({ k: "deal", id: d.id })} style={{ display: "flex", width: "100%", gap: 10, alignItems: "center", textAlign: "left", background: "var(--well)", borderRadius: 13, padding: "10px 13px" }}>
              <span className="sw" style={{ background: stageOf(d.status)!.dot }} />
              <span style={{ flex: 1, minWidth: 0 }}>{d.title}<span className="small muted" style={{ display: "block" }}>{stageOf(d.status)!.name}</span></span>
              <b className="display" style={{ fontWeight: 600 }}>{zarK(d.value)}</b>
            </button>
          </li>
        ))}
      </ul>
      <Sub>Activity</Sub>
      <Feed list={s.activity.filter((a) => a.customerId === id).slice(0, 6)} />
    </Drawer>
  );
}

/* ---------------- forms ---------------- */
function Field({ label, children, full, error }: { label: string; children: ReactNode; full?: boolean; error?: string }) {
  return (
    <label className={full ? "full" : ""}>
      <span className="lab">{label}</span>
      {children}
      {error && <span className="err" role="alert" style={{ display: "block" }}>{error}</span>}
    </label>
  );
}
const num = (v: string) => Number(v.replace(/[^\d.]/g, ""));

function NewDeal({ preset, onClose }: { preset: { customerId?: string; title?: string; pumpType?: PumpType }; onClose: () => void }) {
  const { s, addDeal, toast } = useStore();
  const router = useRouter();
  const [f, setF] = useState({ title: preset.title ?? "", customerId: preset.customerId ?? "", value: "", service: SERVICES[0] as Service, pumpType: preset.pumpType ?? ("Machines" as PumpType), urgency: "planned" as Urgency, source: "Phone" as Source, closes: "14" });
  const [err, setErr] = useState<Record<string, string>>({});
  const up = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal label="New enquiry" onClose={onClose}>
      {(leave) => (
        <form noValidate onSubmit={(e: FormEvent) => {
          e.preventDefault();
          const er: Record<string, string> = {};
          if (!f.title.trim()) er.title = "Say what needs doing.";
          if (!f.customerId) er.customerId = "Pick a customer.";
          if (!(num(f.value) > 0)) er.value = "Enter an estimate in rand.";
          setErr(er);
          if (Object.keys(er).length) return;
          const id = addDeal({ title: f.title.trim(), customerId: f.customerId, value: num(f.value), service: f.service, pumpType: f.pumpType, urgency: f.urgency, source: f.source, closesIn: Number(f.closes) });
          toast(`${id} added to Enquiry.`);
          leave();
          router.push("/pipeline/");
        }}>
          <H leave={leave}>New enquiry</H>
          <div className="form">
            <Field label="What needs doing" full error={err.title}><input data-autofocus className="inp" value={f.title} onChange={up("title")} placeholder="Fabricate a conveyor support frame" /></Field>
            <Field label="Customer" error={err.customerId}>
              <select className="inp" value={f.customerId} onChange={up("customerId")}>
                <option value="">Choose a customer</option>
                {s.customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </Field>
            <Field label="Estimate, excl. VAT" error={err.value}><input className="inp" inputMode="numeric" value={f.value} onChange={up("value")} placeholder="85 000" /></Field>
            <Field label="Service"><select className="inp" value={f.service} onChange={up("service")}>{SERVICES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Work category"><select className="inp" value={f.pumpType} onChange={up("pumpType")}>{PUMP_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Urgency"><select className="inp" value={f.urgency} onChange={up("urgency")}><option value="planned">Planned</option><option value="breakdown">Urgent</option><option value="shutdown">Project deadline</option></select></Field>
            <Field label="Expected close"><select className="inp" value={f.closes} onChange={up("closes")}><option value="2">In 2 days</option><option value="7">In a week</option><option value="14">In 2 weeks</option><option value="30">In a month</option></select></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" className="btn" onClick={leave}>Cancel</button>
            <button className="btn gold">Add enquiry</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function NewCustomer({ onClose }: { onClose: () => void }) {
  const { addCustomer, setOpen, toast } = useStore();
  const [f, setF] = useState({ contact: "", role: "", company: "", segment: "Mining" as Segment, town: "", phone: "", email: "" });
  const [err, setErr] = useState<Record<string, string>>({});
  const up = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal label="New customer" onClose={onClose}>
      {(leave) => (
        <form noValidate onSubmit={(e) => {
          e.preventDefault();
          const er: Record<string, string> = {};
          if (!f.contact.trim()) er.contact = "Enter a contact name.";
          if (!f.company.trim()) er.company = "Enter the company.";
          if (!f.phone.trim() && !f.email.trim()) er.phone = "Add a phone number or an email.";
          setErr(er);
          if (Object.keys(er).length) return;
          const id = addCustomer({ ...f, contact: f.contact.trim(), company: f.company.trim(), role: f.role || "Contact", town: f.town || "Gauteng", phone: f.phone || "Not given", email: f.email || "Not given" });
          toast(`${f.company.trim()} added.`);
          setOpen({ k: "customer", id });
        }}>
          <H leave={leave}>New customer</H>
          <div className="form">
            <Field label="Contact name" error={err.contact}><input data-autofocus className="inp" value={f.contact} onChange={up("contact")} /></Field>
            <Field label="Role"><input className="inp" value={f.role} onChange={up("role")} placeholder="Engineering manager" /></Field>
            <Field label="Company" error={err.company}><input className="inp" value={f.company} onChange={up("company")} /></Field>
            <Field label="Industry"><select className="inp" value={f.segment} onChange={up("segment")}>{SEGMENTS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Phone" error={err.phone}><input className="inp" inputMode="tel" value={f.phone} onChange={up("phone")} /></Field>
            <Field label="Email"><input className="inp" type="email" value={f.email} onChange={up("email")} /></Field>
            <Field label="Town" full><input className="inp" value={f.town} onChange={up("town")} placeholder="Boksburg" /></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" className="btn" onClick={leave}>Cancel</button>
            <button className="btn gold">Add customer</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function NewEvent({ preset, onClose }: { preset: { date?: string; start?: number }; onClose: () => void }) {
  const { s, dispatch, toast } = useStore();
  const [f, setF] = useState({ kind: "Strategy call" as EventKind, title: "", customerId: s.customers[0].id, date: preset.date ?? today(), start: String(preset.start ?? 9), hours: "1.5", who: "DV" });
  const [err, setErr] = useState("");
  const up = (k: string) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  return (
    <Modal label="Book a slot" onClose={onClose}>
      {(leave) => (
        <form noValidate onSubmit={(e) => {
          e.preventDefault();
          if (!f.title.trim()) return setErr("Add a short description.");
          const event: CalEvent = { id: "e" + Date.now(), kind: f.kind, title: f.title.trim(), customerId: f.customerId, date: f.date, start: Number(f.start), hours: Number(f.hours), who: f.who };
          dispatch({ t: "addEvent", event });
          toast(`${f.kind} booked for ${fmtDay(f.date)}.`);
          leave();
        }}>
          <H leave={leave}>Book a slot</H>
          <div className="form">
            <Field label="Description" full error={err}><input data-autofocus className="inp" value={f.title} onChange={up("title")} placeholder="Discuss fabrication requirements" /></Field>
            <Field label="Type"><select className="inp" value={f.kind} onChange={up("kind")}>{EVENT_KINDS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            <Field label="Customer"><select className="inp" value={f.customerId} onChange={up("customerId")}>{s.customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}</select></Field>
            <Field label="Date"><input className="inp" type="date" value={f.date} onChange={up("date")} /></Field>
            <Field label="Start"><select className="inp" value={f.start} onChange={up("start")}>{Array.from({ length: 48 }, (_, i) => i / 2).map((h) => <option key={h} value={h}>{String(Math.floor(h)).padStart(2, "0")}:{h % 1 ? "30" : "00"}</option>)}</select></Field>
            <Field label="Length"><select className="inp" value={f.hours} onChange={up("hours")}>{[1, 1.5, 2, 2.5, 3, 4].map((h) => <option key={h} value={h}>{h} h</option>)}</select></Field>
            <Field label="Who"><select className="inp" value={f.who} onChange={up("who")}>{TEAM.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
            <button type="button" className="btn" onClick={leave}>Cancel</button>
            <button className="btn gold"><CalendarPlus size={16} /> Book</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function Message({ o, onClose }: { o: { customerId: string; text: string; channel: "WhatsApp" | "Email"; done?: () => void }; onClose: () => void }) {
  const { s, customer, dispatch, toast } = useStore();
  const pr = s.prospects.find((x) => x.id === o.customerId);
  const c = pr ? { id: pr.id, contact: pr.contact, company: pr.company, email: pr.email, phone: "" } : customer(o.customerId);
  const [text, setText] = useState(o.text);
  return (
    <Modal label={`${o.channel} message`} onClose={onClose}>
      {(leave) => (
        <form onSubmit={(e) => {
          e.preventDefault();
          dispatch({ t: "log", text: `sent ${o.channel === "Email" ? "an email" : "a WhatsApp"} to ${c.contact}`, customerId: pr ? undefined : c.id });
          o.done?.();
          toast(`Logged on ${c.company}. Demo only, nothing was sent.`);
          leave();
        }}>
          <H leave={leave}>{o.channel} to {c.contact}</H>
          <p className="muted small" style={{ marginTop: 4 }}>{o.channel === "Email" ? c.email : c.phone}</p>
          <textarea data-autofocus className="inp" rows={7} style={{ marginTop: 14 }} value={text} onChange={(e) => setText(e.target.value)} aria-label="Message" />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
            <button type="button" className="btn" onClick={leave}>Cancel</button>
            <button className="btn gold" disabled={!text.trim()}>Send</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------------- new campaign ---------------- */
function NewCampaign({ preset, onClose }: { preset: { audience?: AudienceKey; segment?: Segment }; onClose: () => void }) {
  const { s, dispatch, toast } = useStore();
  const router = useRouter();
  const [aud, setAud] = useState<AudienceKey>(preset.audience ?? "due");
  const [seg, setSeg] = useState<Segment | "All">(preset.segment ?? (preset.audience === "prospects" ? "Mining" : "All"));
  const [name, setName] = useState("");
  const cold = aud === "prospects";
  const built = useMemo(() => buildAudience(s, aud, seg), [s, aud, seg]);
  const steps = useMemo(() => stepsFor(aud, seg === "All" ? "Mining" : seg), [aud, seg]);
  const auto = `${AUDIENCES[aud].name}${seg === "All" ? "" : ", " + seg.toLowerCase()}`;
  const save = (start: boolean) => {
    const c: Campaign = { id: "k" + Date.now().toString(36), name: name.trim() || auto, audience: aud, segment: seg, status: "Draft", steps, recipients: built.list };
    dispatch({ t: "addCampaign", c });
    if (start) dispatch({ t: "startCampaign", id: c.id });
    toast(start ? `${c.name} started. ${c.recipients.length} emails logged, nothing was sent.` : `${c.name} saved as a draft.`);
    onClose();
    if (window.location.pathname.startsWith("/outreach")) window.location.hash = c.id;
    else router.push("/outreach/#" + c.id);
  };
  return (
    <Modal label="New campaign" onClose={onClose} wide>
      {(leave) => (
        <form onSubmit={(e) => { e.preventDefault(); save(true); }}>
          <H leave={leave}>New campaign</H>
          <div className="newcamp">
            <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
              <Field label="Campaign name"><input data-autofocus className="inp" value={name} onChange={(e) => setName(e.target.value)} placeholder={auto} /></Field>
              <fieldset style={{ display: "grid", gap: 8 }}>
                <legend className="lab">Who gets it</legend>
                {(Object.keys(AUDIENCES) as AudienceKey[]).map((k) => {
                  const kSeg = k === "prospects" ? (seg === "All" ? "Mining" : seg) : k === aud ? seg : "All";
                  const n = buildAudience(s, k, kSeg).list.length;
                  return (
                    <label key={k} className={"pick" + (aud === k ? " on" : "")}>
                      <input type="radio" name="aud" checked={aud === k} onChange={() => { setAud(k); setSeg(k === "prospects" ? "Mining" : "All"); }} />
                      <span style={{ flex: 1, minWidth: 0 }}><b style={{ fontWeight: 600 }}>{AUDIENCES[k].name}</b><span className="small muted" style={{ display: "block" }}>{AUDIENCES[k].blurb}</span></span>
                      <span className="display tnum" style={{ fontWeight: 600, fontSize: 18 }}>{n}</span>
                    </label>
                  );
                })}
              </fieldset>
              <Field label={cold ? "Industry, one per list" : "Industry"}>
                <select className="inp" value={seg} onChange={(e) => setSeg(e.target.value as Segment | "All")}>
                  {!cold && <option value="All">All industries</option>}
                  {SEGMENTS.map((x) => <option key={x}>{x}</option>)}
                </select>
              </Field>
              <p className="small muted">
                {cold ? "Prospects get one email that asks permission. Follow ups open only when they reply." : `${steps.length} emails over ${steps[steps.length - 1].day} days. It stops for anyone who replies.`}
                {(built.out > 0 || built.inUse > 0) && ` Left out: ${[built.out ? `${built.out} off the list` : "", built.inUse ? `${built.inUse} already in a campaign` : ""].filter(Boolean).join(", ")}.`}
              </p>
            </div>
            <div style={{ minWidth: 0 }}>
              <span className="lab">First email, as it will read</span>
              {built.list.length ? <Paper step={steps[0]} list={built.list} /> : <div className="panel"><Empty>Nobody fits this list right now.</Empty></div>}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18, flexWrap: "wrap" }}>
            <button type="button" className="btn" disabled={!built.list.length} onClick={() => save(false)}>Save draft</button>
            <button className="btn gold" disabled={!built.list.length}>Start with {built.list.length}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function LogCall({ preset, onClose }: { preset?: string; onClose: () => void }) {
  const { s, dispatch, toast } = useStore();
  const [id, setId] = useState(preset ?? s.customers[0].id);
  const [note, setNote] = useState("");
  return (
    <Modal label="Log a call" onClose={onClose}>
      {(leave) => (
        <form onSubmit={(e) => {
          e.preventDefault();
          const c = s.customers.find((x) => x.id === id)!;
          dispatch({ t: "log", text: `logged a call with ${c.contact}${note.trim() ? `: ${note.trim()}` : ""}`, customerId: id });
          toast(`Call logged on ${c.company}.`);
          leave();
        }}>
          <H leave={leave}>Log a call</H>
          <div className="form">
            <Field label="Customer" full><select className="inp" value={id} onChange={(e) => setId(e.target.value)}>{s.customers.map((c) => <option key={c.id} value={c.id}>{c.contact}, {c.company}</option>)}</select></Field>
            <Field label="Notes" full><textarea data-autofocus className="inp" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Discuss drawings, materials and job requirements" /></Field>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 18 }}>
            <button type="button" className="btn" onClick={leave}>Cancel</button>
            <button className="btn gold">Save call</button>
          </div>
        </form>
      )}
    </Modal>
  );
}

/* ---------------- search ---------------- */
function SearchBox({ onClose }: { onClose: () => void }) {
  const { s, setOpen } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    const out: { key: string; icon: ReactNode; a: string; b: string; go: () => void }[] = [];
    const hit = (...x: string[]) => x.some((v) => v.toLowerCase().includes(t));
    for (const [n, href] of [["Overview", "/"], ["Pipeline", "/pipeline/"], ["Customers", "/customers/"], ["Outreach", "/outreach/"], ["Schedule", "/schedule/"], ["Operations", "/workshop/"], ["Finance", "/finance/"], ["Reports", "/reports/"]])
      if (!t || hit(n)) out.push({ key: href, icon: <FileText size={16} />, a: n, b: "Page", go: () => { onClose(); router.push(href); } });
    s.customers.filter((c) => t && hit(c.contact, c.company, c.town, c.segment, ...c.pumps.map((p) => p.tag))).slice(0, 5).forEach((c: Customer) =>
      out.push({ key: c.id, icon: <User size={16} />, a: c.company, b: `${c.contact}, ${c.town}`, go: () => setOpen({ k: "customer", id: c.id }) }));
    s.deals.filter((d) => t && isOpen(d) && hit(d.id, d.title, s.customers.find((c) => c.id === d.customerId)?.company ?? "")).slice(0, 5).forEach((d: Deal) =>
      out.push({ key: d.id, icon: d.urgency === "breakdown" ? <Siren size={16} /> : <FileText size={16} />, a: d.title, b: `${d.id}, ${stageOf(d.status)!.name}, ${zarK(d.value)}`, go: () => setOpen({ k: "deal", id: d.id }) }));
    s.jobs.filter((j) => t && hit(j.id, j.title)).slice(0, 4).forEach((j) =>
      out.push({ key: j.id, icon: <Factory size={16} />, a: `${j.id}, ${j.title}`, b: `${j.done} of 6 stages`, go: () => { onClose(); router.push("/workshop/#" + j.id); } }));
    return out;
  }, [q, s, onClose, router, setOpen]);
  useEffect(() => setI(0), [q]);
  return (
    <Modal label="Search" onClose={onClose} top>
      {() => (
        <div>
          <div className="field" style={{ height: 58, borderRadius: "24px 24px 0 0", border: 0, borderBottom: "1px solid var(--line)", padding: "0 20px" }}>
            <Search size={18} />
            <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Customer, enquiry, project or service reference" aria-label="Search" style={{ fontSize: 16 }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setI((x) => Math.min(list.length - 1, x + 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setI((x) => Math.max(0, x - 1)); }
                if (e.key === "Enter") { e.preventDefault(); list[i]?.go(); }
              }} />
          </div>
          <div style={{ padding: 8 }}>
            {list.length === 0 && <Empty>Nothing matches that. Try a company name or a service reference.</Empty>}
            {list.map((x, k) => (
              <button key={x.key} onClick={x.go} onPointerEnter={() => setI(k)} tabIndex={-1}
                style={{ display: "flex", gap: 12, alignItems: "center", width: "100%", textAlign: "left", padding: "10px 13px", borderRadius: 14, background: k === i ? "var(--well-2)" : "transparent" }}>
                <span className="muted">{x.icon}</span><span style={{ flex: 1 }}>{x.a}</span><span className="small muted">{x.b}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

export function Overlays() {
  const { open, setOpen, toasts, dismiss } = useStore();
  const close = useCallback(() => setOpen(null), [setOpen]);
  return (
    <>
      {open?.k === "deal" && <DealDrawer key={open.id} id={open.id} onClose={close} />}
      {open?.k === "customer" && <CustomerDrawer key={open.id} id={open.id} onClose={close} />}
      {open?.k === "newDeal" && <NewDeal preset={open} onClose={close} />}
      {open?.k === "newCustomer" && <NewCustomer onClose={close} />}
      {open?.k === "newEvent" && <NewEvent preset={open} onClose={close} />}
      {open?.k === "message" && <Message o={open} onClose={close} />}
      {open?.k === "newCampaign" && <NewCampaign preset={open} onClose={close} />}
      {open?.k === "call" && <LogCall preset={open.customerId} onClose={close} />}
      {open?.k === "search" && <SearchBox onClose={close} />}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <ToastRow key={t.id} text={t.text} undo={t.undo} close={() => dismiss(t.id)} />
        ))}
      </div>
      <span className="sr">Signed in as {ME.name}</span>
    </>
  );
}

function ToastRow({ text, undo, close }: { text: string; undo?: () => void; close: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    if (ref.current && !reduced()) gsap.from(ref.current, { y: 20, opacity: 0, duration: 0.45, ease: "power3.out" });
  }, []);
  return (
    <div className="toast" ref={ref}>
      <span>{text}</span>
      {undo && <button onClick={() => { undo(); close(); }}>Undo</button>}
    </div>
  );
}
