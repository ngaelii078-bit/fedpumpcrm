import { addDays, addMonths, daysBetween, fmtDay, iso, parse, today } from "./format";
import type {
  AudienceKey, Campaign, CampaignStep, Customer, Deal, MailReply, Prospect, Pump, Recipient, ReplyKind, Segment, State,
} from "./types";

/* Demo outreach settings: no messages are sent. */
export const SIGN = ["Naledi", "LexBridge", "Logistics coordination"];
export const STOP_LINE = "Reply stop and I will take you off this list.";

export const DOMAINS = [
  { name: "lexbridge-mail.example", boxes: 5, health: 100, warm: 14, cap: 150 },
  { name: "lexbridge-outreach.example", boxes: 5, health: 86, warm: 9, cap: 0 },
];
export const DAILY_CAP = DOMAINS.reduce((a, d) => a + d.cap, 0);

export const AUDIENCES: Record<AudienceKey, { name: string; blurb: string; kind: "customer" | "prospect" }> = {
  due: { name: "Review due", blurb: "Customers with a service review due in the next 60 days", kind: "customer" },
  quiet: { name: "Gone quiet", blurb: "Customers nobody has contacted in 7 days", kind: "customer" },
  lost: { name: "Lost quotes", blurb: "Customers who turned a quote down in 6 months", kind: "customer" },
  prospects: { name: "New prospects", blurb: "Companies that have not bought yet. One email each.", kind: "prospect" },
};

const OPENER: Record<Segment, string> = {
  Retail: "I would like to learn about your store delivery needs in {{city}}.",
  Manufacturing: "I would like to learn about your transport needs in {{city}}.",
  "E-commerce": "I would like to learn about your order delivery needs in {{city}}.",
  Services: "I would like to learn about your courier and mailroom needs in {{city}}.",
};

export function stepsFor(key: AudienceKey, seg: Segment = "Retail"): CampaignStep[] {
  if (key === "due") return [
    { day: 0, subject: "Review: {{serviceRef}}", body: "Hi {{firstName}},\n\nYour service review for {{serviceRef}} is due on {{dueDate}}.\n\nWould you like to schedule a review?" },
    { day: 4, subject: "Re: {{serviceRef}}", body: "Hi {{firstName}},\n\nFollowing up on your service review for {{serviceRef}}.\n\nWhat day suits you?" },
  ];
  if (key === "quiet") return [
    { day: 0, subject: "{{companyName}} logistics", body: "Hi {{firstName}},\n\nIt has been {{quietDays}} days since we last spoke.\n\nWould you like to review your delivery needs?" },
    { day: 5, subject: "Re: {{companyName}} logistics", body: "Hi {{firstName}},\n\nCould we arrange a short call?" },
  ];
  if (key === "lost") return [
    { day: 0, subject: "{{quoteRef}}", body: "Hi {{firstName}},\n\nWe discussed {{quoteTitle}} in {{quoteMonth}}.\n\nHave your logistics needs changed?" },
    { day: 6, subject: "Re: {{quoteRef}}", body: "Hi {{firstName}},\n\nMay I follow up on your delivery plans?" },
  ];
  return [{ day: 0, subject: "{{companyName}} logistics", body: `Hi {{firstName}},\n\n${OPENER[seg]}\n\nLexBridge assesses requirements and coordinates logistics providers.\n\nCould we arrange a short call?` }];
}

/* merge fields each audience can use */
export const FIELDS: Record<AudienceKey, string[]> = {
  due: ["firstName", "companyName", "city", "serviceRef", "lastReview", "dueDate", "monthsSinceReview", "interval"],
  quiet: ["firstName", "companyName", "city", "quietDays", "serviceCount", "serviceRef", "dueDate"],
  lost: ["firstName", "companyName", "city", "quoteRef", "quoteTitle", "quoteMonth"],
  prospects: ["firstName", "companyName", "city"],
};

/* ---------------- contacts and audiences ---------------- */
export type Contact = { id: string; name: string; first: string; company: string; role: string; town: string; email: string; segment: Segment; kind: "customer" | "prospect"; out: boolean };

type Slim = Pick<State, "customers" | "prospects" | "deals" | "campaigns">;

export function contactOf(s: Pick<State, "customers" | "prospects">, id: string): Contact | undefined {
  const c: Customer | undefined = s.customers.find((x) => x.id === id);
  if (c) return { id, name: c.contact, first: c.contact.split(" ")[0], company: c.company, role: c.role, town: c.town, email: c.email, segment: c.segment, kind: "customer", out: !!c.optOut };
  const p: Prospect | undefined = s.prospects.find((x) => x.id === id);
  if (p) return { id, name: p.contact, first: p.contact.split(" ")[0], company: p.company, role: p.role, town: p.town, email: p.email, segment: p.segment, kind: "prospect", out: p.status === "out" };
}

const dueOf = (p: Pump) => iso(addMonths(parse(p.lastRefurb), p.months));
const nextPump = (c: Customer) => [...c.pumps].sort((a, b) => dueOf(a).localeCompare(dueOf(b)))[0];
const lastLost = (s: Pick<State, "deals">, id: string) =>
  s.deals
    .filter((d) => d.customerId === id && d.status === "lost" && d.closedAt && daysBetween(d.closedAt, today()) <= 183)
    .sort((a, b) => b.closedAt!.localeCompare(a.closedAt!))[0];

const rec = (id: string, extra: Partial<Recipient> = {}): Recipient => ({ id, sent: 0, state: "active", ...extra });

export function buildAudience(s: Slim, key: AudienceKey, seg: Segment | "All" = "All") {
  const busy = new Set(
    s.campaigns.filter((c) => c.status === "Running" || c.status === "Paused").flatMap((c) => c.recipients.filter((x) => x.state === "active" || x.state === "replied").map((x) => x.id)),
  );
  let all: Recipient[] = [];
  if (key === "prospects") all = s.prospects.filter((p) => (p.status === "new" || p.status === "out") && (seg === "All" || p.segment === seg)).map((p) => rec(p.id));
  else {
    const cs = s.customers.filter((c) => seg === "All" || c.segment === seg);
    if (key === "due")
      all = cs.filter((c) => c.pumps.length && daysBetween(today(), dueOf(nextPump(c))) <= 60).map((c) => rec(c.id, { pump: nextPump(c).tag }));
    if (key === "quiet") all = cs.filter((c) => c.pumps.length && daysBetween(c.lastContact, today()) >= 7).map((c) => rec(c.id, { pump: nextPump(c).tag }));
    if (key === "lost") all = cs.filter((c) => lastLost(s, c.id)).map((c) => rec(c.id, { quote: lastLost(s, c.id).id }));
  }
  const out = all.filter((r) => contactOf(s, r.id)?.out).length;
  const inUse = all.filter((r) => !contactOf(s, r.id)?.out && busy.has(r.id)).length;
  return { list: all.filter((r) => !contactOf(s, r.id)?.out && !busy.has(r.id)), out, inUse };
}

/* ---------------- merge ---------------- */
const MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const month = (d: string) => MON[parse(d).getMonth()];

export function mergeVars(s: Slim, r: Recipient): Record<string, string> {
  const k = contactOf(s, r.id);
  const c = s.customers.find((x) => x.id === r.id);
  const p = c?.pumps.find((x) => x.tag === r.pump) ?? (c?.pumps.length ? nextPump(c) : undefined);
  const q = r.quote ? s.deals.find((d) => d.id === r.quote) : undefined;
  const v: Record<string, string> = { firstName: k?.first ?? "there", companyName: k?.company ?? "", city: k?.town ?? "" };
  if (c) {
    v.quietDays = String(Math.max(1, daysBetween(c.lastContact, today())));
    v.serviceCount = String(c.pumps.length);
  }
  if (p) {
    v.serviceRef = p.tag;
    v.lastReview = `${month(p.lastRefurb)} ${parse(p.lastRefurb).getFullYear()}`;
    v.dueDate = fmtDay(dueOf(p));
    v.interval = String(p.months);
    v.monthsSinceReview = String(Math.max(1, Math.round(daysBetween(p.lastRefurb, today()) / 30.4)));
  }
  if (q) {
    v.quoteRef = q.id;
    v.quoteTitle = q.title.charAt(0).toLowerCase() + q.title.slice(1);
    v.quoteMonth = month(q.closedAt ?? q.created);
  }
  return v;
}

/** text split so the filled in parts can be marked */
export function merge(text: string, v: Record<string, string>): { t: string; m?: boolean; bad?: boolean }[] {
  return text.split(/(\{\{\w+\}\})/g).filter(Boolean).map((t) => {
    const k = t.match(/^\{\{(\w+)\}\}$/)?.[1];
    if (!k) return { t };
    return v[k] ? { t: v[k], m: true } : { t, bad: true };
  });
}
export const mergeText = (text: string, v: Record<string, string>) => merge(text, v).map((x) => x.t).join("");

/* ---------------- pre-send check ---------------- */
const syl = (word: string) => {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
};
export function readGrade(text: string) {
  const t = text.replace(/\{\{[^}]+\}\}|\[[^\]]+\]/g, "name");
  const sents = t.split(/[.!?\n]+/).filter((x) => /[A-Za-z]/.test(x));
  const words = t.match(/[A-Za-z][A-Za-z']*/g) ?? [];
  if (!words.length || !sents.length) return { words: 0, grade: 0 };
  const g = (0.39 * words.length) / sents.length + (11.8 * words.reduce((a, w) => a + syl(w), 0)) / words.length - 15.59;
  return { words: words.length, grade: Math.max(0, Math.round(g * 10) / 10) };
}
const BANNED = ["dear sir", "finds you well", "leading", "premium", "top quality", "solutions", "innovative", "partner with you", "synerg", "competitive price", "many clients"];

export function presend(step: CampaignStep, key: AudienceKey, first: boolean) {
  const { words, grade } = readGrade(step.body);
  const low = `${step.subject} ${step.body}`.toLowerCase();
  const used = [...`${step.subject} ${step.body}`.matchAll(/\{\{(\w+)\}\}/g)].map((x) => x[1]);
  const unknown = used.filter((u) => !FIELDS[key].includes(u));
  const ban = BANNED.find((b) => low.includes(b));
  const rows = [
    { ok: words > 0 && words < 80, label: `${words} words`, hint: "Keep it under 80" },
    { ok: grade <= 3.5, label: grade < 1 ? "Reads below grade 1" : `Reads at grade ${grade}`, hint: "Use shorter words to get to 3.5 or less" },
    { ok: step.body.trim().endsWith("?"), label: "Ends on a question", hint: "Finish with an easy ask" },
    { ok: !!step.subject.trim(), label: "Has a subject", hint: "Use their name, service reference or quote" },
    { ok: !/https?:|www\./.test(low), label: "No links", hint: "Take the link out" },
    { ok: !ban, label: "No sales talk", hint: ban ? `Remove "${ban}"` : "" },
    { ok: !/\d+\s*(?:to|-|\u2013)\s*\d+/.test(low), label: "No ranges", hint: "Use one exact number" },
    { ok: !/\[[^\]]*\]/.test(step.body), label: "Every number confirmed", hint: "Fill in or remove the [brackets]" },
    { ok: !unknown.length, label: "Merge fields work", hint: unknown.length ? `No data for {{${unknown[0]}}}` : "" },
  ];
  if (first) rows.push({ ok: !/\br\s?\d/.test(low), label: "No price in the first email", hint: "Give the price when they ask" });
  return { rows, ok: rows.every((r) => r.ok), words, grade };
}

/* ---------------- replies ---------------- */
export const REPLY_LABEL: Record<ReplyKind, string> = { quote: "Wants a quote", yes: "Said yes", later: "Not now", stop: "Asked to stop" };
export const READY: Record<ReplyKind, string> = {
  quote: "Thanks {{firstName}}. Could you share the collection and delivery locations and shipment details?",
  yes: "Thanks {{firstName}}. What logistics needs would you like to discuss?",
  later: "No problem {{firstName}}. I'll check in again then.",
  stop: "Done {{firstName}}, you're off our list.",
};
const INCOMING: Record<"customer" | "prospect", [ReplyKind, string][]> = {
  customer: [
    ["quote", "Yes, book it in. Can you give me a price before it comes to you?"],
    ["later", "Budget is done for this year. Try me in January."],
    ["yes", "Hold the slot please, I'll confirm with production."],
    ["quote", "Good timing. Can you quote on our deliveries?"],
  ],
  prospect: [
    ["yes", "Please send some details about your services."],
    ["quote", "Can someone review our delivery needs this week?"],
    ["later", "Not now, we have a contract until March."],
    ["stop", "Not interested, please remove us."],
  ],
};
export const replyFor = (kind: "customer" | "prospect", n: number) => INCOMING[kind][n % INCOMING[kind].length];

/* ---------------- numbers ---------------- */
export function score(s: Pick<State, "deals">, cs: Campaign[]) {
  const rs = cs.flatMap((c) => c.recipients);
  const reached = rs.filter((r) => r.sent > 0);
  const deals = rs.filter((r) => r.dealId).map((r) => s.deals.find((d) => d.id === r.dealId)).filter((d): d is Deal => !!d);
  const won = deals.filter((d) => d.status === "won");
  return {
    contacts: rs.length,
    reached: reached.length,
    sent: rs.reduce((a, r) => a + r.sent, 0),
    replies: rs.filter((r) => r.reply).length,
    quotes: deals.length,
    quoteValue: deals.reduce((a, d) => a + d.value, 0),
    orders: won.length,
    orderValue: won.reduce((a, d) => a + d.value, 0),
    out: rs.filter((r) => r.state === "out").length,
  };
}

/* ---------------- seed ---------------- */
const PLACES = ["Vlierbos", "Duikerhoek", "Nagtegaal", "Knoppiekop", "Geelhoutrand", "Wolfkrantz", "Kwartelberg", "Suurvlakte", "Loerieveld", "Ystervark", "Bosduif", "Mielieland"];
const PEOPLE: Record<Segment, string[]> = {
  Retail: ["Jaco Pretorius", "Lebo Maseko", "Deon Visser", "Sipho Ndlovu", "Carina Nel", "Thulani Zwane", "Riaan Swart", "Palesa Moeketsi", "Gert Lombard", "Bongani Cele", "Yolandi Roux", "Musa Hadebe"],
  Manufacturing: ["Priya Singh", "Wayne Jacobs", "Nthabiseng Tau", "Craig Meyer", "Fatima Patel", "Lwazi Dlamini", "Anton Wessels", "Keamo Phiri", "Shaun Peters", "Zodwa Mthembu", "Imraan Khan", "Hester Vorster"],
  "E-commerce": ["Kobus Steenkamp", "Nandi Buthelezi", "Francois Malan", "Tebogo Kgosi", "Wikus Coetzee", "Sibongile Radebe", "Danie Viljoen", "Refilwe Motaung", "Louis Grobler", "Ayanda Khumalo", "Petro Barnard", "Mpho Letsoalo"],
  Services: ["Themba Gumede", "Rika Janse", "Oupa Masilela", "Divya Moodley", "Andile Mkhize", "Marius Botes", "Lerato Seabi", "Kevin Reddy", "Noluthando Sibiya", "Hannes Kotze", "Busi Nkabinde", "Jerome Adams"],
};
const KIND: Record<Segment, [string[], string[], string[]]> = {
  Retail: [["Retail", "Stores", "Home", "Trading"], ["Operations Manager", "Logistics Manager", "Buyer", "Owner"], ["Ogies", "Rustenburg", "Steelpoort", "Carletonville"]],
  Manufacturing: [["Paper", "Foods", "Chemicals", "Packaging"], ["Maintenance Lead", "Plant Manager", "Utilities Manager", "Buyer"], ["Springs", "Germiston", "Sasolburg", "Isando"]],
  "E-commerce": [["Online", "Shop", "Market", "Commerce"], ["Owner", "Fulfilment Manager", "Operations Manager", "Owner"], ["Groblersdal", "Bethal", "Heidelberg", "Delmas"]],
  Services: [["Group", "Consulting", "Offices", "Services"], ["Office Manager", "Operations Manager", "Facilities Manager", "Director"], ["Vereeniging", "Benoni", "Midrand", "Brakpan"]],
};

export function seedProspects(): Prospect[] {
  const out: Prospect[] = [];
  (Object.keys(KIND) as Segment[]).forEach((segment) => {
    const [suffix, roles, towns] = KIND[segment];
    PLACES.forEach((pl, i) => {
      const contact = PEOPLE[segment][i];
      const company = `${pl} ${suffix[i % 4]}`;
      out.push({
        id: `p${segment.slice(0, 2)}${i}`, contact, role: roles[i % 4], company, segment, town: towns[(i + 1) % 4],
        email: `${contact.split(" ")[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.example`, status: "new",
      });
    });
  });
  return out;
}

export function seedOutreach(t0: Date, now: Date, customers: Customer[], deals: Deal[]): Pick<State, "prospects" | "campaigns" | "replies"> {
  const prospects = seedProspects();
  const day = (n: number) => iso(addDays(t0, n));
  const of = (seg: Segment) => prospects.filter((p) => p.segment === seg);
  const deal = (title: string) => deals.find((d) => d.title === title && d.status !== "lost" && daysBetween(d.created, iso(t0)) < 60);
  const link = (d?: Deal) => {
    if (d) d.source = "Outreach";
    return d?.id;
  };
  const wonBy = (id: string) =>
    deals.filter((d) => d.customerId === id && d.status === "won" && d.closedAt && daysBetween(d.closedAt, iso(t0)) < 110 && daysBetween(d.closedAt, iso(t0)) > 12 && d.source !== "Outreach")[0];

  const base: Slim = { customers, prospects, deals, campaigns: [] };
  const due = buildAudience(base, "due").list.filter((r) => {
    const p = customers.find((c) => c.id === r.id)?.pumps.find((x) => x.tag === r.pump);
    return p && daysBetween(iso(t0), dueOf(p)) <= 31;
  });
  const campaigns: Campaign[] = [];

  /* 1. running: refurbs due, two of three steps out */
  const dueReplies: Record<string, ReplyKind> = { c16: "quote", c2: "later", c13: "yes", c7: "quote" };
  campaigns.push({
    id: "k1", name: "Service reviews due", audience: "due", segment: "All", status: "Running", started: day(-9), steps: stepsFor("due"),
    recipients: due.map((r) => {
      const reply = dueReplies[r.id];
      const early = r.id === "c7";
      return {
        ...r, sent: early ? 1 : 2, lastSent: day(early ? -9 : -5), reply, repliedOn: reply ? day(early ? -8 : r.id === "c13" ? -2 : 0) : undefined, state: reply ? "replied" : "active",
        dealId: early ? link(deal("International delivery plan")) : undefined,
      };
    }),
  });

  /* 2. running: first contact with mines, part of the list sent */
  campaigns.push({
    id: "k2", name: "Retail logistics prospects", audience: "prospects", segment: "Retail", status: "Running", started: day(-2), steps: stepsFor("prospects", "Retail"),
    recipients: of("Retail").map((p, i) => {
      const sent = i < 8 ? 1 : 0;
      const reply: ReplyKind | undefined = i === 1 ? "yes" : i === 5 ? "stop" : undefined;
      if (sent) p.status = "emailed";
      return { id: p.id, sent, lastSent: sent ? day(i < 4 ? -2 : -1) : undefined, reply, repliedOn: reply ? day(0) : undefined, state: reply ? "replied" : "active" };
    }),
  });

  /* 3. finished: lost quotes */
  const lostIds = ["c3", "c11", "c6", "c9", "c12", "c1", "c10", "c5"];
  const lostReply: Record<string, ReplyKind> = { c3: "quote", c11: "quote", c9: "later" };
  campaigns.push({
    id: "k3", name: "Lost quotes, second look", audience: "lost", segment: "All", status: "Finished", started: day(-27), steps: stepsFor("lost"),
    recipients: lostIds.map((id, i) => {
      const reply = lostReply[id];
      const q = deals.filter((d) => d.customerId === id && d.status === "lost")[0];
      return {
        id, quote: q?.id, sent: reply ? 1 : 2, lastSent: day(reply ? -27 : -21), reply, repliedOn: reply ? day(-26 + i) : undefined, state: reply ? "replied" : "done",
        dealId: id === "c3" ? link(deal("E-commerce fulfilment")) : id === "c11" ? link(deal("E-commerce fulfilment plan")) : undefined,
      };
    }),
  });

  /* 4. finished: water works, two of them are customers now */
  campaigns.push({
    id: "k4", name: "Business services prospects", audience: "prospects", segment: "Services", status: "Finished", started: day(-41), steps: stepsFor("prospects", "Services"),
    recipients: [
      ...["c15", "c16"].map((id): Recipient => ({ id, sent: 1, lastSent: day(-41), reply: "quote", repliedOn: day(id === "c15" ? -40 : -37), state: "replied", dealId: link(deal(id === "c15" ? "Mailroom service assessment" : "Cross-border courier")) })),
      ...of("Services").map((p, i): Recipient => {
        const reply: ReplyKind | undefined = i === 3 ? "later" : i === 7 ? "stop" : undefined;
        p.status = reply === "stop" ? "out" : "emailed";
        if (reply === "stop") p.outSince = day(-39);
        return { id: p.id, sent: 1, lastSent: day(-41 + (i % 3)), reply, repliedOn: reply ? day(-39) : undefined, state: reply === "stop" ? "out" : reply ? "replied" : "done" };
      }),
    ],
  });

  /* 5. finished: plants, the one that paid */
  campaigns.push({
    id: "k5", name: "Plants on the East Rand", audience: "prospects", segment: "Manufacturing", status: "Finished", started: day(-118), steps: stepsFor("prospects", "Manufacturing"),
    recipients: [
      ...["c8", "c9", "c6"].map((id, i): Recipient => ({ id, sent: 1, lastSent: day(-118), reply: "quote", repliedOn: day(-52 + i * 5), state: "replied", dealId: link(wonBy(id)) })),
      ...of("Manufacturing").slice(0, 9).map((p, i): Recipient => {
        const reply: ReplyKind | undefined = i === 2 ? "later" : undefined;
        p.status = "emailed";
        return { id: p.id, sent: 1, lastSent: day(-118 + (i % 4)), reply, repliedOn: reply ? day(-47) : undefined, state: reply ? "replied" : "done" };
      }),
    ],
  });

  /* 6. draft */
  campaigns.push({
    id: "k6", name: "E-commerce prospects", audience: "prospects", segment: "E-commerce", status: "Draft", steps: stepsFor("prospects", "E-commerce"),
    recipients: of("E-commerce").map((p) => ({ id: p.id, sent: 0, state: "active" as const })),
  });

  const min = (m: number) => now.getTime() - m * 60000;
  const mining = of("Retail");
  const replies: MailReply[] = [
    { id: "r1", campaignId: "k1", contactId: "c16", kind: "quote", text: "Yes please, can we arrange a review of our courier service?", at: min(3), done: false, title: "International courier review", pumpType: "Freight", estimate: 94500 },
    { id: "r2", campaignId: "k2", contactId: mining[1].id, kind: "yes", text: "Please send information on your courier services.", at: min(21), done: false, title: "Courier service assessment", pumpType: "International", estimate: 148000 },
    { id: "r3", campaignId: "k1", contactId: "c2", kind: "later", text: "We will review our delivery contract in January. Please ask again then.", at: min(96), done: false, title: "Delivery contract review", pumpType: "International", estimate: 142000 },
    { id: "r4", campaignId: "k2", contactId: mining[5].id, kind: "stop", text: "Not for us, please remove.", at: min(240), done: false, title: "", pumpType: "International", estimate: 0 },
    { id: "r5", campaignId: "k1", contactId: "c7", kind: "quote", text: "Please send the updated delivery quote.", at: min(11500), done: true, title: "International delivery plan", pumpType: "Domestic", estimate: 0 },
    { id: "r6", campaignId: "k1", contactId: "c13", kind: "yes", text: "Hold it for the second week of December.", at: min(2900), done: true, title: "Mailroom service review", pumpType: "Domestic", estimate: 0 },
  ];
  return { prospects, campaigns, replies };
}

const PUMP_BY_SEG: Record<Segment, MailReply["pumpType"]> = { Retail: "International", Manufacturing: "Domestic", "E-commerce": "Domestic", Services: "Freight" };
const EST: Record<MailReply["pumpType"], number> = { Domestic: 118000, International: 142000, Freight: 86000 };

/** Demo only. Sends whatever is next in the campaign and lets a reply or two arrive. */
export function playDay(s: State, id: string): { state: State; sent: number; replies: number; finished: boolean } {
  const c = s.campaigns.find((x) => x.id === id);
  if (!c || c.status !== "Running") return { state: s, sent: 0, replies: 0, finished: false };
  const put = (next: Campaign, extra: Partial<State> = {}): State => ({ ...s, ...extra, campaigns: s.campaigns.map((x) => (x.id === id ? next : x)) });
  const can = (r: Recipient) => r.state === "active" && r.sent < c.steps.length;
  if (!c.recipients.some(can))
    return { state: put({ ...c, status: "Finished", recipients: c.recipients.map((r) => (r.state === "active" ? { ...r, state: "done" } : r)) }), sent: 0, replies: 0, finished: true };

  const cap = c.audience === "prospects" ? 6 : 40;
  let sent = 0;
  const mailed = new Set<string>();
  let recipients = c.recipients.map((r) => {
    if (!can(r) || sent >= cap) return r;
    sent++;
    mailed.add(r.id);
    return { ...r, sent: r.sent + 1, lastSent: today() };
  });
  const pool = recipients.filter((r) => r.state === "active" && r.sent > 0);
  const n = Math.min(pool.length, pool.length >= 8 ? 2 : 1);
  const fresh: MailReply[] = [];
  for (let k = 0; k < n; k++) {
    const r = pool[(s.replies.length * 5 + k * 3) % pool.length];
    const who = contactOf(s, r.id);
    if (!who || fresh.some((f) => f.contactId === r.id)) continue;
    const [kind, text] = replyFor(who.kind, s.replies.length + k);
    const pump = s.customers.find((x) => x.id === r.id)?.pumps.find((p) => p.tag === r.pump);
    const pumpType = pump?.type ?? PUMP_BY_SEG[who.segment];
    fresh.push({
      id: "r" + Math.random().toString(36).slice(2, 8), campaignId: id, contactId: r.id, kind, text, at: Date.now(), done: false,
      title: pump ? `Service review: ${pump.tag}` : `${pumpType} logistics enquiry`, pumpType, estimate: EST[pumpType],
    });
  }
  recipients = recipients.map((r) => {
    const f = fresh.find((x) => x.contactId === r.id);
    return f ? { ...r, reply: f.kind, repliedOn: today(), state: "replied" as const } : r;
  });
  const prospects = s.prospects.map((p) => (mailed.has(p.id) && p.status === "new" ? { ...p, status: "emailed" as const } : p));
  return { state: put({ ...c, recipients }, { prospects, replies: [...fresh, ...s.replies] }), sent, replies: fresh.length, finished: false };
}
