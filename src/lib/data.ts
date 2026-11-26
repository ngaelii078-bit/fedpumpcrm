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
  { id: "RG", name: "Ravi", role: "Workshop coordinator", tone: "#CBE6D5" },
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

export const JOB_STAGES = ["Enquiry received", "Assess requirements", "Plan & quote", "Fabricate or repair", "Inspect & test", "Complete & hand over"];
export const MONTH_TARGET = 900000;
export const SEGMENTS: Segment[] = ["Mining", "Manufacturing", "Engineering", "Contractors"];
export const SOURCES: Source[] = ["Repeat", "Referral", "WhatsApp", "Website", "Phone", "Outreach"];
export const SERVICES: Service[] = [
  "Machine builds", "Platework & fabrication", "Pipework & fittings", "Repairs & refurbishment", "Structural steelwork", "Engineering consulting", "Assessment",
];
export const PUMP_TYPES: PumpType[] = ["Machines", "Fabrication", "Repairs"];
export const EVENT_KINDS: EventKind[] = ["Strategy call", "Partner meeting", "Assessment", "Service review", "Follow-up"];

export const SEG_COLOR: Record<Segment, string> = {
  Mining: "#BF8632", Manufacturing: "#4A90D9", "Engineering": "#E0603A", Contractors: "#2FA37A",
};
export const SRC_COLOR: Record<Source, string> = {
  Repeat: "#BF8632", Referral: "#4A90D9", WhatsApp: "#E0603A", Website: "#2FA37A", Phone: "#B070C4", Outreach: "#8F9A3A",
};

export const MACHINES = [
  { name: "Machine builds", hours: 46, cap: 56 },
  { name: "Platework & fabrication", hours: 51, cap: 56 },
  { name: "Repairs", hours: 33, cap: 56 },
  { name: "Fabrication", hours: 21, cap: 56 },
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
  ["c1", "Pieter Steyn", "Operations Manager", "Ironwood Mining", "Mining", "Johannesburg", 2, 88, 41, true, "Repeat", [["RB-001", "Machines", "Conveyor drive assembly", 5, 6]]],
  ["c2", "Kagiso Molefe", "Engineering Manager", "Sable Ridge Mine", "Mining", "Pretoria", 0, 94, 63, true, "Repeat", [["RB-002", "Repairs", "Conveyor refurbishment", 4, 6]]],
  ["c3", "Anele Dube", "Plant Engineer", "Thornveld Minerals", "Mining", "Cape Town", 5, 71, 22, false, "Referral", [["RB-003", "Fabrication", "Feed hopper", 5, 6]]],
  ["c4", "Willem Fourie", "Buyer", "Amber Ore", "Mining", "Durban", 1, 91, 55, true, "Repeat", [["RB-004", "Fabrication", "Transfer chute", 5, 6]]],
  ["c5", "Nomsa Khoza", "Operations Lead", "Kiaat Resources", "Mining", "Midrand", 8, 64, 14, false, "Phone", [["RB-005", "Repairs", "Plant equipment repair", 5, 6]]],
  ["c6", "Sanjay Pillay", "Engineering Manager", "Drakens Paper", "Manufacturing", "Springs", 3, 82, 37, false, "Repeat", [["RB-006", "Machines", "Custom machine frame", 5, 6]]],
  ["c7", "Ruth Adams", "Operations Manager", "Copperleaf Products", "Manufacturing", "Sasolburg", 1, 86, 48, true, "Referral", [["RB-007", "Fabrication", "Conveyor support frame", 5, 6]]],
  ["c8", "Themba Nkosi", "Engineering Lead", "Delmora Foods", "Manufacturing", "Boksburg", 6, 68, 19, false, "Website", [["RB-008", "Fabrication", "Process tank", 5, 6]]],
  ["c9", "Ilse Botha", "Plant Manager", "Marulane Beverages", "Manufacturing", "Isando", 11, 59, 11, false, "Website", [["RB-009", "Repairs", "Plant pipework", 5, 6]]],
  ["c10", "Hennie Marais", "Owner", "Bergvallei Engineering", "Engineering", "Groblersdal", 4, 77, 16, false, "WhatsApp", [["RB-010", "Machines", "Machine frame", 5, 6]]],
  ["c11", "Lindiwe Zulu", "Project Manager", "Suikerbos Engineering", "Engineering", "Bethal", 9, 66, 12, false, "WhatsApp", [["RB-011", "Fabrication", "Transfer chute", 5, 6]]],
  ["c12", "Johan Kruger", "Owner", "Kareebos Engineering", "Engineering", "Heidelberg", 13, 52, 7, false, "Phone", [["RB-012", "Machines", "Kiln assembly", 5, 6]]],
  ["c13", "Mandla Sithole", "Project Manager", "Vaalkrans Contractors", "Contractors", "Vereeniging", 1, 90, 52, true, "Repeat", [["RB-013", "Fabrication", "Structural steelwork", 5, 6]]],
  ["c14", "Farah Ismail", "Site Manager", "Silverstream Projects", "Contractors", "Benoni", 0, 79, 28, false, "Phone", [["RB-014", "Repairs", "Equipment repair", 5, 6]]],
  ["c15", "Grant Naidoo", "Project Manager", "Highveld Contractors", "Contractors", "Midrand", 7, 61, 9, false, "Website", [["RB-015", "Fabrication", "Structural steelwork", 5, 6]]],
  ["c16", "Zanele Mabaso", "Operations Manager", "Mopane Projects", "Contractors", "Polokwane", 10, 70, 24, false, "Referral", [["RB-016", "Fabrication", "Pipework and fittings", 5, 6]]],
];

type D = [string, string, number, Stage, number, string[], Service, PumpType, Urgency, Source];
const OPEN: D[] = [
 ["Conveyor drive assembly", "c1", 142000, "enquiry", 9, ["DV", "TM"], "Machine builds", "Machines", "planned", "Phone"],
 ["Kiln support frame", "c2", 187300, "enquiry", 26, ["DV", "NP"], "Structural steelwork", "Fabrication", "planned", "Repeat"],
 ["Hopper design review", "c3", 68400, "enquiry", 18, ["DV"], "Engineering consulting", "Fabrication", "planned", "Referral"],
 ["Custom machine frame", "c6", 54200, "enquiry", 22, ["RG", "DV"], "Machine builds", "Machines", "planned", "Repeat"],
 ["Structural steel assessment", "c15", 96500, "enquiry", 31, ["NP"], "Assessment", "Fabrication", "planned", "Website"],
 ["Machine frame fabrication", "c10", 38600, "enquiry", 12, ["NP", "TM"], "Machine builds", "Machines", "planned", "WhatsApp"],
 ["Transfer chute assessment", "c4", 412000, "inspect", 16, ["TM", "DV"], "Platework & fabrication", "Fabrication", "planned", "Repeat"],
 ["Conveyor refurbishment review", "c2", 236500, "inspect", 11, ["TM", "DV", "RG"], "Repairs & refurbishment", "Repairs", "planned", "Repeat"],
 ["Urgent equipment repair", "c14", 58900, "inspect", 3, ["TM"], "Repairs & refurbishment", "Repairs", "breakdown", "Phone"],
 ["Conveyor support frame design", "c7", 318400, "inspect", 24, ["DV", "TM"], "Engineering consulting", "Fabrication", "planned", "Referral"],
 ["Structural steel installation", "c13", 286000, "quoted", 15, ["DV", "TM"], "Structural steelwork", "Fabrication", "planned", "Repeat"],
 ["Pipework installation", "c16", 205800, "quoted", 27, ["DV"], "Pipework & fittings", "Fabrication", "planned", "Referral"],
 ["Hopper fabrication", "c3", 174600, "quoted", 10, ["DV", "RG"], "Platework & fabrication", "Fabrication", "planned", "Referral"],
 ["Site steelwork", "c13", 264300, "po", 5, ["DV", "TM"], "Structural steelwork", "Fabrication", "planned", "Repeat"],
 ["Conveyor frame build", "c2", 221800, "po", 7, ["TM", "DV", "RG"], "Machine builds", "Machines", "planned", "Repeat"],
 ["Plant repair programme", "c5", 148700, "po", 10, ["DV", "NP"], "Repairs & refurbishment", "Repairs", "planned", "Phone"],
];

/* This month's won opportunities and active engagements. */
type W = [string, string, number, number, string[], Service, PumpType, Urgency, Source, number, number, string, string, string];
const RECENT: W[] = [
 ["Machine frame build", "c6", 198400, 12, ["TM", "DV"], "Machine builds", "Machines", "planned", "Repeat", 3, 7, "Machine builds", "workshop", "orrrrrroro"],
 ["Conveyor refurbishment", "c2", 214600, 15, ["TM", "RG"], "Repairs & refurbishment", "Repairs", "planned", "Repeat", 4, 3, "Repairs", "casing", "rxxxxorror"],
 ["Urgent site equipment repair", "c14", 96800, 4, ["TM"], "Repairs & refurbishment", "Repairs", "breakdown", "Phone", 3, 1, "Repairs", "casing", "oxrrxoxoror"],
 ["Conveyor support fabrication", "c7", 74500, 18, ["RG", "DV"], "Structural steelwork", "Fabrication", "planned", "Referral", 5, 0, "Fabrication", "machining", "orxooororr"],
 ["Chute fabrication", "c11", 63700, 10, ["TM", "NP"], "Platework & fabrication", "Fabrication", "planned", "WhatsApp", 4, 5, "Fabrication", "workshop", "oroorxoxroo"],
];

/* last number is the typical size of the job */
const PAST_TITLES: [string, Service, PumpType, number][] = [
 ["Conveyor machine build", "Machine builds", "Machines", 2.6],
 ["Kiln frame build", "Machine builds", "Machines", 1.9],
 ["Feed hopper build", "Platework & fabrication", "Fabrication", 1.1],
 ["Pipework and fittings", "Pipework & fittings", "Fabrication", 0.8],
 ["Equipment refurbishment", "Repairs & refurbishment", "Repairs", 0.4],
 ["Structural steelwork", "Structural steelwork", "Fabrication", 1],
 ["Mechanical assessment", "Engineering consulting", "Repairs", 0.5],
];
const LOST_WHY = ["Existing supplier", "Price", "Project postponed", "Lead time", "No reply"];

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
  const nextRef = () => `RQ-${++ref}`;
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
      const g = k < 4 ? SEGMENTS[(k + i) % 4] : lean < 0.45 ? "Mining" : lean < 0.72 ? "Manufacturing" : lean < 0.82 ? "Engineering" : "Contractors";
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
      id: `RB-${++jobNo}`, dealId: id, customerId, title, pumpType, done, due: day(due), machine, urgency,
      photo, parts: partsFor(pumpType, code),
    });
  });
  [["Pipework study", "c16", 118000, 6], ["Equipment repair", "c9", 37200, 9]].forEach(([title, customerId, value, back]) => {
    deals.push({
      id: nextRef(), title: title as string, customerId: customerId as string, value: value as number, status: "lost",
      closes: inMonth(back as number), closedAt: inMonth(back as number), created: day(-(back as number) - 20), owners: ["DV"],
      service: title === "Pipework study" ? "Pipework & fittings" : "Repairs & refurbishment", pumpType: title === "Pipework study" ? "Fabrication" : "Repairs", urgency: "planned", source: "Website", pos: 0, lostReason: "Existing supplier",
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
    ["Transfer chute assessment", 2, 16, "Fabrication", "workshop", "orxrxrrror"],
    ["Conveyor refurbishment review", 1, 11, "Repairs", "casing", "rxxxxrrror"],
    ["Urgent equipment repair", 2, 3, "Repairs", "casing", "oroorxxooro"],
  ];
  onFloor.forEach(([title, done, due, machine, photo, code]) => {
    const d = deals.find((x) => x.title === title && x.status === "inspect")!;
    jobs.push({
      id: `RB-${++jobNo}`, dealId: d.id, customerId: d.customerId, title, pumpType: d.pumpType, done, due: day(due),
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
    ["Partner meeting", "Project planning", "c2", 0, 7, 2.5, "TM"],
    ["Strategy call", "Machine build assessment", "c1", 0, 11, 2, "DV"],
    ["Assessment", "Review chute requirements", "c4", 1, 8, 3, "TM"],
    ["Strategy call", "Steelwork review", "c15", 1, 13, 1.5, "NP"],
    ["Follow-up", "Urgent repair planning", "c14", 1, 18.5, 2, "TM"],
    ["Service review", "Confirm machine build", "c6", 2, 7.5, 2, "RG"],
    ["Assessment", "Review support frame", "c7", 2, 10, 2, "DV"],
    ["Strategy call", "Fabrication planning meeting", "c7", 2, 14, 2, "DV"],
    ["Partner meeting", "Review site steelwork", "c13", 3, 6.5, 3, "TM"],
    ["Service review", "Confirm equipment repair", "c14", 4, 8, 2, "RG"],
    ["Strategy call", "Quarterly review", "c2", 8, 10, 2, "NP"],
  ];
  const events: CalEvent[] = ev.map(([kind, title, customerId, off, start, hours, who], i) => ({
    id: `e${i}`, kind, title, customerId, date: iso(addDays(mon, off)), start, hours, who,
  }));

  const min = 60000;
  const at = (m: number) => now.getTime() - m * min;
  const find = (title: string) => deals.find((d) => d.title === title)?.id;
  const activity: Activity[] = [
    { id: "a1", who: "TM", text: "coordinated an urgent equipment repair", at: at(18), customerId: "c14" },
    { id: "a2", who: "DV", text: "sent a hopper fabrication proposal", at: at(64), customerId: "c3", dealId: find("Hopper fabrication") },
    { id: "a3", who: "NP", text: "logged a call with Kagiso Molefe", at: at(141), customerId: "c2" },
    { id: "a4", who: "LJ", text: "matched a payment from Drakens Paper", at: at(205), customerId: "c6" },
    { id: "a5", who: "RG", text: "confirmed a machine build for Ironwood", at: at(322), customerId: "c1" },
  ];
  const inbox: InboxItem[] = [
    { id: "m1", channel: "Website", from: "Themba Nkosi, Delmora Foods", customerId: "c8", text: "Can you assess our tank fabrication requirements?", at: at(26), service: "Platework & fabrication", pumpType: "Fabrication", estimate: 61500, urgency: "planned", title: "Tank fabrication assessment", done: false },
    { id: "m2", channel: "WhatsApp", from: "Nomsa Khoza, Kiaat Resources", customerId: "c5", text: "We need urgent equipment repairs. Can you help?", at: at(52), service: "Repairs & refurbishment", pumpType: "Repairs", estimate: 118000, urgency: "breakdown", title: "Urgent equipment repair", done: false },
    { id: "m3", channel: "Email", from: "Ruth Adams, Copperleaf Products", customerId: "c7", text: "Please quote on a conveyor support frame.", at: at(188), service: "Platework & fabrication", pumpType: "Fabrication", estimate: 34800, urgency: "planned", title: "Support frame quote", done: false },
  ];

  const outreach = seedOutreach(t0, now, customers, deals);

  return { seedDay: iso(t0), deals, customers, jobs, invoices, events, activity, inbox, ...outreach };
}

const today0 = (d: Date) => iso(d);
