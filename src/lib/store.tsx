"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { JOB_STAGES, ME, probOf, seed, stageOf } from "./data";
import { addDays, iso, today } from "./format";
import { contactOf, playDay } from "./outreach";
import { partsFor } from "./pumps";
import type { AudienceKey, CalEvent, Campaign, CampaignStep, Customer, Deal, DealStatus, Job, Segment, State } from "./types";

type NewDeal = Pick<Deal, "title" | "customerId" | "value" | "service" | "pumpType" | "urgency" | "source"> & { closesIn: number };
type NewCustomer = Pick<Customer, "contact" | "role" | "company" | "segment" | "town" | "phone" | "email"> & Partial<Pick<Customer, "source">>;

type Action =
  | { t: "set"; state: State }
  | { t: "move"; id: string; to: DealStatus; pos?: number; who?: string }
  | { t: "addDeal"; deal: Deal }
  | { t: "addCustomer"; customer: Customer }
  | { t: "star"; id: string }
  | { t: "log"; text: string; customerId?: string; dealId?: string }
  | { t: "advance"; id: string }
  | { t: "pay"; id: string }
  | { t: "remind"; id: string }
  | { t: "addEvent"; event: CalEvent }
  | { t: "inboxDone"; id: string }
  | { t: "addCampaign"; c: Campaign }
  | { t: "campaign"; id: string; patch: Partial<Campaign> }
  | { t: "step"; id: string; i: number; patch: Partial<CampaignStep> }
  | { t: "startCampaign"; id: string }
  | { t: "stopRecipient"; id: string; who: string }
  | { t: "replyDone"; id: string; dealId?: string; customerId?: string }
  | { t: "optOut"; id: string; on: boolean };

const uid = () => Math.random().toString(36).slice(2, 9);

function log(s: State, text: string, customerId?: string, dealId?: string, who = ME.id): State["activity"] {
  return [{ id: uid(), who, text, at: Date.now(), customerId, dealId }, ...s.activity].slice(0, 60);
}
const touch = (s: State, id?: string) =>
  id ? s.customers.map((c) => (c.id === id ? { ...c, lastContact: today() } : c)) : s.customers;

function reduce(s: State, a: Action): State {
  switch (a.t) {
    case "set":
      return a.state;
    case "move": {
      const d = s.deals.find((x) => x.id === a.id);
      if (!d) return s;
      const closed = a.to === "won" || a.to === "lost";
      const next: Deal = {
        ...d,
        status: a.to,
        pos: a.pos ?? d.pos,
        closedAt: closed ? today() : undefined,
        lostReason: a.to === "lost" ? "Marked lost in pipeline" : undefined,
      };
      let { jobs, invoices } = s;
      if (a.to === "won" && d.status !== "won") {
        const existing = jobs.find((j) => j.dealId === d.id);
        if (existing) {
          jobs = jobs.map((j) => (j.dealId === d.id ? { ...j, done: Math.max(j.done, 3) } : j));
        } else {
          const no = Math.max(...jobs.map((j) => +j.id.slice(3))) + 1;
          const job: Job = {
            id: `RB-${no}`, dealId: d.id, customerId: d.customerId, title: d.title, pumpType: d.pumpType, done: 3,
            due: iso(addDays(new Date(), 14)), machine: d.pumpType,
            urgency: d.urgency, photo: "casing", parts: partsFor(d.pumpType, "orxrrrrrorr"),
          };
          jobs = [job, ...jobs];
        }
        const invNo = Math.max(...invoices.map((i) => +i.id.slice(4))) + 1;
        invoices = [
          ...invoices,
          { id: `INV-${invNo}`, dealId: d.id, customerId: d.customerId, title: d.title, amount: d.value, date: today(), due: iso(addDays(new Date(), 30)), status: "Draft" },
        ];
      } else if (d.status === "won" && a.to !== "won") {
        invoices = invoices.filter((i) => !(i.dealId === d.id && i.status === "Draft"));
        jobs = jobs.filter((j) => j.dealId !== d.id);
      }
      const label = a.to === "won" ? "Won" : a.to === "lost" ? "Lost" : stageOf(a.to)!.name;
      const changed = d.status !== a.to;
      return {
        ...s,
        deals: s.deals.map((x) => (x.id === d.id ? next : x)),
        jobs,
        invoices,
        activity: changed ? log(s, `moved ${d.title} to ${label}`, d.customerId, d.id) : s.activity,
      };
    }
    case "addDeal":
      return {
        ...s,
        deals: [...s.deals, a.deal],
        customers: touch(s, a.deal.customerId),
        activity: log(s, `logged a new enquiry: ${a.deal.title}`, a.deal.customerId, a.deal.id),
      };
    case "addCustomer":
      return { ...s, customers: [a.customer, ...s.customers], activity: log(s, `added ${a.customer.company}`, a.customer.id) };
    case "star":
      return { ...s, customers: s.customers.map((c) => (c.id === a.id ? { ...c, starred: !c.starred } : c)) };
    case "log":
      return { ...s, customers: touch(s, a.customerId), activity: log(s, a.text, a.customerId, a.dealId) };
    case "advance": {
      const j = s.jobs.find((x) => x.id === a.id);
      if (!j || j.done >= 6) return s;
      const done = j.done + 1;
      const name = JOB_STAGES[done - 1];
      return {
        ...s,
        jobs: s.jobs.map((x) => (x.id === j.id ? { ...x, done } : x)),
        activity: log(s, done === 6 ? `completed ${j.id}; invoice remains a draft` : `completed ${name} on ${j.id}`, j.customerId, undefined, "TM"),
      };
    }
    case "pay":
      return {
        ...s,
        invoices: s.invoices.map((i) => (i.id === a.id ? { ...i, status: "Paid" as const, paidAt: today() } : i)),
        activity: log(s, `marked ${a.id} as paid`, s.invoices.find((i) => i.id === a.id)?.customerId, undefined, "LJ"),
      };
    case "remind":
      return {
        ...s,
        invoices: s.invoices.map((i) => (i.id === a.id ? { ...i, reminded: true } : i)),
        activity: log(s, `sent a reminder for ${a.id}`, s.invoices.find((i) => i.id === a.id)?.customerId, undefined, "LJ"),
      };
    case "addEvent":
      return { ...s, events: [...s.events, a.event], activity: log(s, `booked ${a.event.kind.toLowerCase()}: ${a.event.title}`, a.event.customerId) };
    case "inboxDone":
      return { ...s, inbox: s.inbox.map((m) => (m.id === a.id ? { ...m, done: true } : m)) };
    case "addCampaign":
      return { ...s, campaigns: [a.c, ...s.campaigns], activity: log(s, `created the campaign ${a.c.name}`) };
    case "campaign":
      return { ...s, campaigns: s.campaigns.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case "step":
      return { ...s, campaigns: s.campaigns.map((c) => (c.id === a.id ? { ...c, steps: c.steps.map((x, i) => (i === a.i ? { ...x, ...a.patch } : x)) } : c)) };
    case "startCampaign": {
      const c = s.campaigns.find((x) => x.id === a.id);
      if (!c || c.status === "Running") return s;
      const ids = new Set(c.recipients.filter((r) => r.state === "active" && r.sent === 0).map((r) => r.id));
      return {
        ...s,
        campaigns: s.campaigns.map((x) =>
          x.id === a.id
            ? { ...x, status: "Running" as const, started: x.started ?? today(), recipients: x.recipients.map((r) => (ids.has(r.id) ? { ...r, sent: 1, lastSent: today() } : r)) }
            : x,
        ),
        prospects: s.prospects.map((p) => (ids.has(p.id) && p.status === "new" ? { ...p, status: "emailed" as const } : p)),
        activity: log(s, `started ${c.name}, ${ids.size} first emails`),
      };
    }
    case "stopRecipient":
      return { ...s, campaigns: s.campaigns.map((c) => (c.id === a.id ? { ...c, recipients: c.recipients.map((r) => (r.id === a.who ? { ...r, state: "done" as const } : r)) } : c)) };
    case "replyDone": {
      const m = s.replies.find((x) => x.id === a.id);
      if (!m) return s;
      return {
        ...s,
        replies: s.replies.map((x) => (x.id === a.id ? { ...x, done: true } : x)),
        campaigns: a.dealId
          ? s.campaigns.map((c) => (c.id === m.campaignId ? { ...c, recipients: c.recipients.map((r) => (r.id === m.contactId ? { ...r, dealId: a.dealId } : r)) } : c))
          : s.campaigns,
        prospects: a.customerId ? s.prospects.map((p) => (p.id === m.contactId ? { ...p, status: "customer" as const, customerId: a.customerId } : p)) : s.prospects,
      };
    }
    case "optOut": {
      const k = contactOf(s, a.id);
      if (!k) return s;
      return {
        ...s,
        customers: s.customers.map((c) => (c.id === a.id ? { ...c, optOut: a.on, outSince: a.on ? today() : undefined } : c)),
        prospects: s.prospects.map((p) => (p.id === a.id && a.on ? { ...p, status: "out" as const, outSince: today() } : p)),
        campaigns: a.on ? s.campaigns.map((c) => ({ ...c, recipients: c.recipients.map((r) => (r.id === a.id ? { ...r, state: "out" as const } : r)) })) : s.campaigns,
        replies: a.on ? s.replies.map((m) => (m.contactId === a.id && m.kind === "stop" ? { ...m, done: true } : m)) : s.replies,
        activity: log(s, a.on ? `took ${k.company} off the mailing list` : `put ${k.company} back on the mailing list`, k.kind === "customer" ? a.id : undefined),
      };
    }
  }
}

export type Toast = { id: string; text: string; undo?: () => void };

type Ctx = {
  s: State;
  ready: boolean;
  dispatch: (a: Action) => void;
  moveDeal: (id: string, to: DealStatus, pos?: number) => void;
  addDeal: (d: NewDeal) => string;
  addCustomer: (c: NewCustomer) => string;
  toast: (text: string, undo?: () => void) => void;
  toasts: Toast[];
  dismiss: (id: string) => void;
  reset: () => void;
  customer: (id: string) => Customer;
  playCampaign: (id: string) => void;
  convertReply: (id: string) => string | undefined;
  /* overlays */
  open: Overlay | null;
  setOpen: (o: Overlay | null) => void;
};

export type Overlay =
  | { k: "deal"; id: string }
  | { k: "customer"; id: string }
  | { k: "newDeal"; customerId?: string; title?: string; pumpType?: Deal["pumpType"] }
  | { k: "newCustomer" }
  | { k: "newEvent"; date?: string; start?: number }
  | { k: "message"; customerId: string; text: string; channel: "WhatsApp" | "Email"; done?: () => void }
  | { k: "newCampaign"; audience?: AudienceKey; segment?: Segment }
  | { k: "call"; customerId?: string }
  | { k: "search" };

const C = createContext<Ctx | null>(null);
const KEY = "rebotech-crm-demo-v1";
const EMPTY: State = { seedDay: "", deals: [], customers: [], jobs: [], invoices: [], events: [], activity: [], inbox: [], prospects: [], campaigns: [], replies: [] };

export function StoreProvider({ children }: { children: ReactNode }) {
  const [s, raw] = useReducer(reduce, EMPTY);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [open, setOpen] = useState<Overlay | null>(null);
  const ref = useRef(s);
  ref.current = s;

  useEffect(() => {
    let st: State | null = null;
    try {
      const j = localStorage.getItem(KEY);
      if (j) {
        const p = JSON.parse(j) as State;
        if (p.seedDay === today()) st = p; // a fresh demo every day, so dates never go stale
      }
    } catch {}
    raw({ t: "set", state: st ?? seed() });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s, ready]);

  const dispatch = useCallback((a: Action) => raw(a), []);
  const dismiss = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((text: string, undo?: () => void) => {
    const id = uid();
    setToasts((t) => [...t.slice(-2), { id, text, undo }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), undo ? 6500 : 4200);
  }, []);

  const customer = useCallback((id: string) => ref.current.customers.find((c) => c.id === id)!, []);

  const moveDeal = useCallback(
    (id: string, to: DealStatus, pos?: number) => {
      const before = ref.current;
      const d = before.deals.find((x) => x.id === id);
      if (!d) return;
      raw({ t: "move", id, to, pos });
      if (d.status === to) return;
      const undo = () => raw({ t: "set", state: before });
      if (to === "won") toast(`Won. ${d.title} is in the workshop.`, undo);
      else if (to === "lost") toast(`${d.title} marked as lost.`, undo);
      else toast(`${d.title} moved to ${stageOf(to)!.name}.`, undo);
    },
    [toast],
  );

  const addDeal = useCallback((n: NewDeal) => {
    const st = ref.current;
    const no = Math.max(...st.deals.map((d) => +d.id.slice(3))) + 1;
    const first = Math.min(0, ...st.deals.filter((d) => d.status === "enquiry").map((d) => d.pos));
    const { closesIn, ...rest } = n;
    const deal: Deal = {
      ...rest, id: `RQ-${no}`, status: "enquiry", created: today(), closes: iso(addDays(new Date(), closesIn)), owners: [ME.id], pos: first - 10,
    };
    raw({ t: "addDeal", deal });
    return deal.id;
  }, []);

  const addCustomer = useCallback((n: NewCustomer) => {
    const id = "c" + uid();
    raw({
      t: "addCustomer",
      customer: { source: "Phone", ...n, id, score: 50, starred: false, since: today(), lastContact: today(), pumps: [] },
    });
    return id;
  }, []);

  const playCampaign = useCallback(
    (id: string) => {
      const before = ref.current;
      const r = playDay(before, id);
      raw({ t: "set", state: r.state });
      const undo = () => raw({ t: "set", state: before });
      if (r.finished) toast("Nothing left to send. Campaign finished.", undo);
      else toast(`${r.sent} emails logged, ${r.replies} ${r.replies === 1 ? "reply" : "replies"} in. Demo only, nothing was sent.`, undo);
    },
    [toast],
  );

  /* a reply becomes a quote, and a prospect becomes a customer on the way */
  const convertReply = useCallback(
    (id: string) => {
      const st = ref.current;
      const m = st.replies.find((x) => x.id === id);
      const k = m && contactOf(st, m.contactId);
      if (!m || !k) return;
      const customerId =
        k.kind === "customer"
          ? k.id
          : addCustomer({ contact: k.name, role: k.role, company: k.company, segment: k.segment, town: k.town, phone: "Not given", email: k.email, source: "Outreach" });
      const dealId = addDeal({ title: m.title, customerId, value: m.estimate, service: "Assessment", pumpType: m.pumpType, urgency: "planned", source: "Outreach", closesIn: 14 });
      raw({ t: "replyDone", id, dealId, customerId: k.kind === "prospect" ? customerId : undefined });
      toast(`${dealId} added to Enquiry${k.kind === "prospect" ? `, and ${k.company} is now a customer` : ""}.`);
      return dealId;
    },
    [addCustomer, addDeal, toast],
  );

  const reset = useCallback(() => {
    raw({ t: "set", state: seed() });
    toast("Demo data reset.");
  }, [toast]);

  const value = useMemo<Ctx>(
    () => ({ s, ready, dispatch, moveDeal, addDeal, addCustomer, toast, toasts, dismiss, reset, customer, playCampaign, convertReply, open, setOpen }),
    [s, ready, dispatch, moveDeal, addDeal, addCustomer, toast, toasts, dismiss, reset, customer, playCampaign, convertReply, open],
  );
  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useStore() {
  const c = useContext(C);
  if (!c) throw new Error("useStore outside StoreProvider");
  return c;
}

/* selectors */
export const isOpen = (d: Deal) => d.status !== "won" && d.status !== "lost";
export const sum = (ds: { value: number }[]) => ds.reduce((a, d) => a + d.value, 0);
export const weighted = (ds: Deal[]) => ds.reduce((a, d) => a + d.value * probOf(d.status), 0);
export const inMonth = (s: string | undefined, d: Date) =>
  !!s && s.slice(0, 7) === iso(d).slice(0, 7);
export const winRate = (ds: Deal[]) => {
  const w = ds.filter((d) => d.status === "won").length;
  const l = ds.filter((d) => d.status === "lost").length;
  return w + l ? (w / (w + l)) * 100 : 0;
};
export const VAT = 1.15;

import { addMonths, parse } from "./format";
export const nextRefurb = (p: { lastRefurb: string; months: number }) => iso(addMonths(parse(p.lastRefurb), p.months));
