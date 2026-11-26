import { addDays, addMonths, iso, mondayOf, monthStart } from "./format";
import { seedOutreach } from "./outreach";
import { partsFor } from "./pumps";
import type {
  Activity, CalEvent, Customer, Deal, DealStatus, EventKind, InboxItem, Invoice, Job, Member,
  Pump, PumpType, Segment, Service, Source, Stage, State, Urgency,
} from "./types";

/* All people, companies and figures in this file are invented for the demo. */

export const TEAM: Member[] = [
  { id: "NP", name: "Naledi", role: "Front office", tone: "#F4D9B4" },
  { id: "DV", name: "Dirk", role: "Solutions consultant", tone: "#C4DDF2" },
  { id: "TM", name: "Thabo", role: "Operations coordinator", tone: "#F3C7B5" },
  { id: "RG", name: "Ravi", role: "Provider coordinator", tone: "#CBE6D5" },
  { id: "LJ", name: "Lerato", role: "Accounts", tone: "#E3D2EC" },
];
export const ME = TEAM[0];

export const STAGES: { id: Stage; name: string; prob: number; dot: string }[] = [
  { id: "enquiry", name: "Enquiry", prob: 0.15, dot: "#8FC1EE" },
  { id: "inspect", name: "Assessment", prob: 0.4, dot: "#EDB771" },
  { id: "quoted", name: "Quoted", prob: 0.6, dot: "#F07F58" },
  { id: "po", name: "PO pending", prob: 0.9, dot: "#F3F0E9" },
];
export const stageOf = (id: string) => STAGES.find((s) => s.id === id);
export const probOf = (s: DealStatus) => (s === "won" ? 1 : s === "lost" ? 0 : stageOf(s)!.prob);

export const JOB_STAGES = ["Enquiry received", "Assess needs", "Select provider", "Coordinate", "Track progress", "Complete & review"];
export const MONTH_TARGET = 900000;
export const SEGMENTS: Segment[] = ["Retail", "Manufacturing", "E-commerce", "Services"];
export const SOURCES: Source[] = ["Repeat", "Referral", "WhatsApp", "Website", "Phone", "Outreach"];
export const SERVICES: Service[] = [
  "Nationwide courier", "International courier", "Air sea & customs", "Transport & warehousing", "E-commerce logistics", "Mailroom management",
];
export const PUMP_TYPES: PumpType[] = ["Domestic", "International", "Freight"];
export const EVENT_KINDS: EventKind[] = ["Strategy call", "Partner meeting", "Assessment", "Service review", "Follow-up"];

export const SEG_COLOR: Record<Segment, string> = {
  Retail: "#BF8632", Manufacturing: "#4A90D9", "E-commerce": "#E0603A", Services: "#2FA37A",
};
export const SRC_COLOR: Record<Source, string> = {
  Repeat: "#BF8632", Referral: "#4A90D9", WhatsApp: "#E0603A", Website: "#2FA37A", Phone: "#B070C4", Outreach: "#8F9A3A",
};

export const MACHINES = [
  { name: "Domestic courier", hours: 46, cap: 56 },
  { name: "International courier", hours: 51, cap: 56 },
  { name: "Freight & customs", hours: 33, cap: 56 },
  { name: "Warehousing", hours: 21, cap: 56 },
];

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type C = [string, string, string, string, Segment, string, number, number, number, boolean, Source, [string, PumpType, string, number, number][]];
const CUSTOMERS: C[] = [
  ["c1", "Pieter Steyn", "Operations Manager", "Ironwood Retail", "Retail", "Johannesburg", 2, 88, 41, true, "Repeat", [["LBR-001", "Domestic", "Nationwide store deliveries", 5, 6]]],
  ["c2", "Kagiso Molefe", "Supply Chain Manager", "Sable Ridge Stores", "Retail", "Pretoria", 0, 94, 63, true, "Repeat", [["LBR-002", "Domestic", "Store replenishment", 4, 6]]],
  ["c3", "Anele Dube", "Logistics Manager", "Thornveld Trading", "Retail", "Cape Town", 5, 71, 22, false, "Referral", [["LBR-003", "International", "Import deliveries", 5, 6]]],
  ["c4", "Willem Fourie", "Buyer", "Amber Home", "Retail", "Durban", 1, 91, 55, true, "Repeat", [["LBR-004", "Freight", "Inbound freight", 5, 6]]],
  ["c5", "Nomsa Khoza", "Operations Lead", "Kiaat Supplies", "Retail", "Midrand", 8, 64, 14, false, "Phone", [["LBR-005", "Domestic", "Branch deliveries", 5, 6]]],
  ["c6", "Sanjay Pillay", "Supply Chain Manager", "Drakens Paper", "Manufacturing", "Springs", 3, 82, 37, false, "Repeat", [["LBR-006", "Freight", "Pallet distribution", 5, 6]]],
  ["c7", "Ruth Adams", "Operations Manager", "Copperleaf Products", "Manufacturing", "Sasolburg", 1, 86, 48, true, "Referral", [["LBR-007", "International", "International shipments", 5, 6]]],
  ["c8", "Themba Nkosi", "Logistics Lead", "Delmora Foods", "Manufacturing", "Boksburg", 6, 68, 19, false, "Website", [["LBR-008", "Domestic", "Regional distribution", 5, 6]]],
  ["c9", "Ilse Botha", "Plant Manager", "Marulane Beverages", "Manufacturing", "Isando", 11, 59, 11, false, "Website", [["LBR-009", "Freight", "Warehousing and transport", 5, 6]]],
  ["c10", "Hennie Marais", "Owner", "Bergvallei Online", "E-commerce", "Groblersdal", 4, 77, 16, false, "WhatsApp", [["LBR-010", "Domestic", "Online order fulfilment", 5, 6]]],
  ["c11", "Lindiwe Zulu", "Fulfilment Manager", "Suikerbos Shop", "E-commerce", "Bethal", 9, 66, 12, false, "WhatsApp", [["LBR-011", "Domestic", "Customer deliveries", 5, 6]]],
  ["c12", "Johan Kruger", "Owner", "Kareebos Market", "E-commerce", "Heidelberg", 13, 52, 7, false, "Phone", [["LBR-012", "International", "Cross-border orders", 5, 6]]],
  ["c13", "Mandla Sithole", "Facilities Manager", "Vaalkrans Offices", "Services", "Vereeniging", 1, 90, 52, true, "Repeat", [["LBR-013", "Domestic", "Mailroom management", 5, 6]]],
  ["c14", "Farah Ismail", "Office Manager", "Silverstream Group", "Services", "Benoni", 0, 79, 28, false, "Phone", [["LBR-014", "Domestic", "Document deliveries", 5, 6]]],
  ["c15", "Grant Naidoo", "Facilities Manager", "Highveld Services", "Services", "Midrand", 7, 61, 9, false, "Website", [["LBR-015", "Freight", "Storage and transport", 5, 6]]],
  ["c16", "Zanele Mabaso", "Operations Manager", "Mopane Consulting", "Services", "Polokwane", 10, 70, 24, false, "Referral", [["LBR-016", "International", "International courier", 5, 6]]],
];

type D = [string, string, number, Stage, number, string[], Service, PumpType, Urgency, Source];
const OPEN: D[] = [
 ["Nationwide parcel network", "c1", 142000, "enquiry", 9, ["DV", "TM"], "Nationwide courier", "Domestic", "planned", "Phone"],
 ["Store replenishment programme", "c2", 187300, "enquiry", 26, ["DV", "NP"], "Nationwide courier", "Domestic", "planned", "Repeat"],
 ["International shipping review", "c3", 68400, "enquiry", 18, ["DV"], "International courier", "International", "planned", "Referral"],
 ["Freight and warehousing", "c6", 54200, "enquiry", 22, ["RG", "DV"], "Transport & warehousing", "Freight", "planned", "Repeat"],
 ["Mailroom service assessment", "c15", 96500, "enquiry", 31, ["NP"], "Mailroom management", "Domestic", "planned", "Website"],
 ["Online order deliveries", "c10", 38600, "enquiry", 12, ["NP", "TM"], "E-commerce logistics", "Domestic", "planned", "WhatsApp"],
 ["Inbound freight assessment", "c4", 412000, "inspect", 16, ["TM", "DV"], "Air sea & customs", "Freight", "planned", "Repeat"],
 ["Domestic courier review", "c2", 236500, "inspect", 11, ["TM", "DV", "RG"], "Nationwide courier", "Domestic", "planned", "Repeat"],
 ["Urgent document shipment", "c14", 58900, "inspect", 3, ["TM"], "Nationwide courier", "Domestic", "breakdown", "Phone"],
 ["International delivery plan", "c7", 318400, "inspect", 24, ["DV", "TM"], "International courier", "International", "planned", "Referral"],
 ["Air freight and customs", "c13", 286000, "quoted", 15, ["DV", "TM"], "Air sea & customs", "Freight", "planned", "Repeat"],
 ["Cross-border courier", "c16", 205800, "quoted", 27, ["DV"], "International courier", "International", "planned", "Referral"],
 ["E-commerce fulfilment", "c3", 174600, "quoted", 10, ["DV", "RG"], "E-commerce logistics", "Domestic", "planned", "Referral"],
 ["Mailroom coordination", "c13", 264300, "po", 5, ["DV", "TM"], "Mailroom management", "Domestic", "planned", "Repeat"],
 ["Store delivery network", "c2", 221800, "po", 7, ["TM", "DV", "RG"], "Nationwide courier", "Domestic", "planned", "Repeat"],
 ["Warehousing programme", "c5", 148700, "po", 10, ["DV", "NP"], "Transport & warehousing", "Freight", "planned", "Phone"],
];

/* This month's won opportunities and active engagements. */
type W = [string, string, number, number, string[], Service, PumpType, Urgency, Source, number, number, string, string, string];
const RECENT: W[] = [
 ["Regional distribution", "c6", 198400, 12, ["TM", "DV"], "Nationwide courier", "Domestic", "planned", "Repeat", 3, 7, "Domestic courier", "workshop", "orrrrrroro"],
 ["International courier rollout", "c2", 214600, 15, ["TM", "RG"], "International courier", "International", "planned", "Repeat", 4, 3, "International courier", "casing", "rxxxxorror"],
 ["Urgent document delivery", "c14", 96800, 4, ["TM"], "Nationwide courier", "Domestic", "breakdown", "Phone", 3, 1, "Domestic courier", "casing", "oxrrxoxoror"],
 ["Warehousing coordination", "c7", 74500, 18, ["RG", "DV"], "Transport & warehousing", "Freight", "planned", "Referral", 5, 0, "Warehousing", "machining", "orxooororr"],
 ["E-commerce fulfilment plan", "c11", 63700, 10, ["TM", "NP"], "E-commerce logistics", "Domestic", "planned", "WhatsApp", 4, 5, "Domestic courier", "workshop", "oroorxoxroo"],
];

/* last number is the typical size of the job */
const PAST_TITLES: [string, Service, PumpType, number][] = [
 ["Nationwide delivery programme", "Nationwide courier", "Domestic", 2.6],
 ["International courier service", "International courier", "International", 1.9],
 ["Air freight and customs", "Air sea & customs", "Freight", 1.1],
 ["Transport and storage", "Transport & warehousing", "Freight", 0.8],
 ["E-commerce delivery plan", "E-commerce logistics", "Domestic", 0.4],
 ["Mailroom management", "Mailroom management", "Domestic", 1],
 ["Cross-border delivery plan", "International courier", "International", 0.5],
];
const LOST_WHY = ["Existing provider", "Price", "Project postponed", "Lead time", "No reply"];

// oldest first, 11 full months before this one
const MONTHLY = [684000, 742000, 655000, 812000, 903000, 768000, 946000, 621000, 858000, 1012000, 884000];

export function seed(now = new Date()): State {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const r = rng(1991);
  const day = (n: number) => iso(addDays(t0, n));
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];

  const customers: Customer[] = CUSTOMERS.map(([id, contact, role, company, segment, town, last, score, since, starred, source, pumps], i) => ({
    id, contact, role, company, segment, town, score, starred, source,
    phone: `011 555 01${String(10 + i)}`,
    email: `${contact.split(" ")[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]+/g, "")}.example`,
    lastContact: day(-last),
    since: iso(addMonths(t0, -since)),
    pumps: pumps.map(([tag, type, desc, ago, months]): Pump => ({
      tag, type, desc, months, lastRefurb: iso(addDays(addMonths(t0, -ago), -(i * 3) % 20)),
    })),
  }));

  let ref = 214;
  const nextRef = () => `LQ-${++ref}`;
  const deals: Deal[] = [];

  /* history */
  MONTHLY.forEach((total, i) => {
    const back = 11 - i;
    const start = monthStart(t0, back);
    const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const n = 6 + Math.floor(r() * 4);
    /* History spans all industries and matches each customer's service profile. */
    const buyers = Array.from({ length: n }, (_, k) => {
      const lean = r();
      const g = k < 4 ? SEGMENTS[(k + i) % 4] : lean < 0.45 ? "Retail" : lean < 0.72 ? "Manufacturing" : lean < 0.82 ? "E-commerce" : "Services";
      return pick(customers.filter((y) => y.segment === g));
    });
    const kinds = buyers.map((c) => pick(PAST_TITLES.filter((k) => c.pumps.some((p) => p.type === k[2]))));
    const w = kinds.map((k) => k[3] * (0.75 + r() * 0.5));
    const sum = w.reduce((a, b) => a + b, 0);
    let left = total;
    w.forEach((x, k) => {
      const value = k === n - 1 ? left : Math.round((total * x) / sum / 100) * 100;
      left -= value;
      const [title, service, pumpType] = kinds[k];
      const c = buyers[k];
      const closed = addDays(start, Math.floor((days - 1) * ((k + 0.3 + r() * 0.5) / n)));
      deals.push({
        id: nextRef(), title, customerId: c.id, value, status: "won", closes: iso(closed), closedAt: iso(closed),
        created: iso(addDays(closed, -(9 + Math.floor(r() * 24)))), owners: [pick(TEAM).id], service, pumpType,
        urgency: r() < 0.2 ? "breakdown" : "planned", source: c.source, pos: 0,
      });
    });
    const lost = 2 + Math.floor(r() * 4);
    for (let k = 0; k < lost; k++) {
      const [title, service, pumpType] = pick(PAST_TITLES);
      const c = pick(customers);
      const closed = addDays(start, Math.floor(r() * (days - 1)));
      deals.push({
        id: nextRef(), title, customerId: c.id, value: Math.round((30000 + r() * 160000) / 100) * 100, status: "lost",
        closes: iso(closed), closedAt: iso(closed), created: iso(addDays(closed, -(14 + Math.floor(r() * 20)))),
        owners: [pick(TEAM).id], service, pumpType, urgency: "planned", source: c.source, pos: 0, lostReason: pick(LOST_WHY),
      });
    }
  });

  /* this month */
  const m0 = monthStart(t0);
  const inMonth = (back: number) => {
    const d = addDays(t0, -back);
    return iso(d < m0 ? m0 : d);
  };
  const jobs: Job[] = [];
  let jobNo = 1178;
  RECENT.forEach(([title, customerId, value, back, owners, service, pumpType, urgency, source, done, due, machine, photo, code]) => {
    const id = nextRef();
    deals.push({
      id, title, customerId, value, status: "won", closes: inMonth(back), closedAt: inMonth(back),
      created: day(-back - 16), owners, service, pumpType, urgency, source, pos: 0,
    });
    jobs.push({
      id: `LB-${++jobNo}`, dealId: id, customerId, title, pumpType, done, due: day(due), machine, urgency,
      photo, parts: partsFor(pumpType, code),
    });
  });
  [["Freight coordination", "c16", 118000, 6], ["Delivery programme", "c9", 37200, 9]].forEach(([title, customerId, value, back]) => {
    deals.push({
      id: nextRef(), title: title as string, customerId: customerId as string, value: value as number, status: "lost",
      closes: inMonth(back as number), closedAt: inMonth(back as number), created: day(-(back as number) - 20), owners: ["DV"],
      service: "Nationwide courier", pumpType: "Domestic", urgency: "planned", source: "Website", pos: 0, lostReason: "Existing provider",
    });
  });

  /* open pipeline */
  OPEN.forEach(([title, customerId, value, status, closes, owners, service, pumpType, urgency, source], i) => {
    deals.push({
      id: nextRef(), title, customerId, value, status, closes: day(closes), created: day(-3 - ((i * 7) % 24)),
      owners, service, pumpType, urgency, source, pos: i * 10,
    });
  });
  /* Assessments in progress before an order is confirmed. */
  const onFloor: [string, number, number, string, string, string][] = [
    ["Inbound freight assessment", 2, 16, "Domestic courier", "workshop", "orxrxrrror"],
    ["Domestic courier review", 1, 11, "International courier", "casing", "rxxxxrrror"],
    ["Urgent document shipment", 2, 3, "Warehousing", "casing", "oroorxxooro"],
  ];
  onFloor.forEach(([title, done, due, machine, photo, code]) => {
    const d = deals.find((x) => x.title === title && x.status === "inspect")!;
    jobs.push({
      id: `LB-${++jobNo}`, dealId: d.id, customerId: d.customerId, title, pumpType: d.pumpType, done, due: day(due),
      machine, urgency: d.urgency, photo, parts: partsFor(d.pumpType, code),
    });
  });

  /* invoices follow the won work */
  let inv = 4406;
  const invoices: Invoice[] = deals
    .filter((d) => d.status === "won" && d.closedAt)
    .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!))
    .map((d): Invoice => {
      const job = jobs.find((j) => j.dealId === d.id);
      const id = `INV-${++inv}`;
      const base = { id, dealId: d.id, customerId: d.customerId, title: d.title, amount: d.value };
      if (job) return { ...base, date: today0(t0), due: day(30), status: "Draft" };
      const closed = new Date(d.closedAt + "T00:00:00");
      const date = addDays(closed, 14 + Math.floor(r() * 15));
      const real = date > t0 ? t0 : date;
      const due = addDays(real, 30);
      const late = (t0.getTime() - due.getTime()) / 86400000;
      const roll = r();
      if (late > 52 || (late > 0 && roll < 0.5) || (late <= 0 && roll < 0.12)) {
        const paid = addDays(due, -14 + Math.floor(r() * 20));
        return { ...base, date: iso(real), due: iso(due), status: "Paid", paidAt: iso(paid > t0 ? addDays(t0, -1) : paid) };
      }
      return { ...base, date: iso(real), due: iso(due), status: late > 0 ? "Overdue" : "Sent" };
    });

  /* calendar */
  const mon = mondayOf(t0);
  const ev: [EventKind, string, string, number, number, number, string][] = [
    ["Partner meeting", "Collection coordination", "c2", 0, 7, 2.5, "TM"],
    ["Strategy call", "Logistics assessment", "c1", 0, 11, 2, "DV"],
    ["Assessment", "Review freight requirements", "c4", 1, 8, 3, "TM"],
    ["Strategy call", "Mailroom review", "c15", 1, 13, 1.5, "NP"],
    ["Follow-up", "Urgent shipment coordination", "c14", 1, 18.5, 2, "TM"],
    ["Service review", "Confirm regional delivery", "c6", 2, 7.5, 2, "RG"],
    ["Assessment", "Review international route", "c7", 2, 10, 2, "DV"],
    ["Strategy call", "Provider planning meeting", "c7", 2, 14, 2, "DV"],
    ["Partner meeting", "Coordinate collection", "c13", 3, 6.5, 3, "TM"],
    ["Service review", "Confirm customer delivery", "c14", 4, 8, 2, "RG"],
    ["Strategy call", "Quarterly review", "c2", 8, 10, 2, "NP"],
  ];
  const events: CalEvent[] = ev.map(([kind, title, customerId, off, start, hours, who], i) => ({
    id: `e${i}`, kind, title, customerId, date: iso(addDays(mon, off)), start, hours, who,
  }));

  const min = 60000;
  const at = (m: number) => now.getTime() - m * min;
  const find = (title: string) => deals.find((d) => d.title === title)?.id;
  const activity: Activity[] = [
    { id: "a1", who: "TM", text: "coordinated an urgent document delivery", at: at(18), customerId: "c14" },
    { id: "a2", who: "DV", text: "sent an e-commerce fulfilment proposal", at: at(64), customerId: "c3", dealId: find("E-commerce fulfilment") },
    { id: "a3", who: "NP", text: "logged a call with Kagiso Molefe", at: at(141), customerId: "c2" },
    { id: "a4", who: "LJ", text: "matched a payment from Drakens Paper", at: at(205), customerId: "c6" },
    { id: "a5", who: "RG", text: "confirmed a provider for Ironwood", at: at(322), customerId: "c1" },
  ];
  const inbox: InboxItem[] = [
    { id: "m1", channel: "Website", from: "Themba Nkosi, Delmora Foods", customerId: "c8", text: "Can you assess our regional delivery requirements?", at: at(26), service: "Nationwide courier", pumpType: "Domestic", estimate: 61500, urgency: "planned", title: "Regional delivery assessment", done: false },
    { id: "m2", channel: "WhatsApp", from: "Nomsa Khoza, Kiaat Supplies", customerId: "c5", text: "We need an urgent delivery arranged. Can you help?", at: at(52), service: "Nationwide courier", pumpType: "Domestic", estimate: 118000, urgency: "breakdown", title: "Urgent delivery", done: false },
    { id: "m3", channel: "Email", from: "Ruth Adams, Copperleaf Products", customerId: "c7", text: "Please quote on international deliveries for our team.", at: at(188), service: "International courier", pumpType: "International", estimate: 34800, urgency: "planned", title: "International courier quote", done: false },
  ];

  const outreach = seedOutreach(t0, now, customers, deals);

  return { seedDay: iso(t0), deals, customers, jobs, invoices, events, activity, inbox, ...outreach };
}

const today0 = (d: Date) => iso(d);
