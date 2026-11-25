import { addDays, addMonths, iso, mondayOf, monthStart } from "./format";
import { partsFor } from "./pumps";
import type {
  Activity, CalEvent, Customer, Deal, DealStatus, EventKind, InboxItem, Invoice, Job, Member,
  Pump, PumpType, Segment, Service, Source, Stage, State, Urgency,
} from "./types";

/* All people, companies and figures in this file are invented for the demo. */

export const TEAM: Member[] = [
  { id: "NP", name: "Naledi", role: "Front office", tone: "#F4D9B4" },
  { id: "DV", name: "Dirk", role: "Estimator", tone: "#C4DDF2" },
  { id: "TM", name: "Thabo", role: "Workshop foreman", tone: "#F3C7B5" },
  { id: "RG", name: "Ravi", role: "Machinist", tone: "#CBE6D5" },
  { id: "LJ", name: "Lerato", role: "Accounts", tone: "#E3D2EC" },
];
export const ME = TEAM[0];

export const STAGES: { id: Stage; name: string; prob: number; dot: string }[] = [
  { id: "enquiry", name: "Enquiry", prob: 0.15, dot: "#8FC1EE" },
  { id: "inspect", name: "Strip & inspect", prob: 0.4, dot: "#EDB771" },
  { id: "quoted", name: "Quoted", prob: 0.6, dot: "#F07F58" },
  { id: "po", name: "PO pending", prob: 0.9, dot: "#F3F0E9" },
];
export const stageOf = (id: string) => STAGES.find((s) => s.id === id);
export const probOf = (s: DealStatus) => (s === "won" ? 1 : s === "lost" ? 0 : stageOf(s)!.prob);

export const JOB_STAGES = ["Receive", "Strip", "Inspect", "Machine", "Assemble", "QC & handover"];
export const MONTH_TARGET = 900000;
export const SEGMENTS: Segment[] = ["Mining", "Manufacturing", "Agriculture", "Water"];
export const SOURCES: Source[] = ["Repeat", "Referral", "WhatsApp", "Website", "Phone"];
export const SERVICES: Service[] = [
  "Pump refurbishment", "Inspection & assessment", "Component reconditioning", "Precision machining",
];
export const PUMP_TYPES: PumpType[] = ["Multistage", "Slurry", "Submersible"];
export const EVENT_KINDS: EventKind[] = ["Site visit", "Collection", "Inspection", "Delivery", "Call-out"];

export const SEG_COLOR: Record<Segment, string> = {
  Mining: "#BF8632", Manufacturing: "#4A90D9", Agriculture: "#E0603A", Water: "#2FA37A",
};
export const SRC_COLOR: Record<Source, string> = {
  Repeat: "#BF8632", Referral: "#4A90D9", WhatsApp: "#E0603A", Website: "#2FA37A", Phone: "#B070C4",
};

export const MACHINES = [
  { name: "Horizontal borer", hours: 46, cap: 56 },
  { name: "Vertical borer", hours: 51, cap: 56 },
  { name: "Milling machine", hours: 33, cap: 56 },
  { name: "Radial arm drill", hours: 21, cap: 56 },
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
  ["c1", "Pieter Steyn", "Engineering Foreman", "Ironwood Colliery", "Mining", "Ogies", 2, 88, 41, true, "Repeat", [
    ["IW-PS3-01", "Multistage", "Dewatering, 8 stage", 17, 18], ["IW-PS3-02", "Multistage", "Dewatering, 8 stage", 6, 18], ["IW-WP-07", "Slurry", "Coal slurry, 150 mm", 9, 10]]],
  ["c2", "Kagiso Molefe", "Plant Engineer", "Sable Ridge Platinum", "Mining", "Rustenburg", 0, 94, 63, true, "Repeat", [
    ["SR-CON-11", "Slurry", "Concentrate, 200 mm", 11, 12], ["SR-CON-12", "Slurry", "Concentrate, 200 mm", 3, 12], ["SR-TL-02", "Slurry", "Tailings, 300 mm", 5, 9], ["SR-DW-04", "Submersible", "Dewatering, 37 kW", 13, 14]]],
  ["c3", "Anele Dube", "Maintenance Planner", "Thornveld Chrome", "Mining", "Steelpoort", 5, 71, 22, false, "Referral", [
    ["TC-SP-04", "Slurry", "Chrome slurry, 100 mm", 7, 8], ["TC-SP-05", "Slurry", "Chrome slurry, 100 mm", 2, 8]]],
  ["c4", "Willem Fourie", "Shaft Engineer", "Amber Deep Gold", "Mining", "Carletonville", 1, 91, 55, true, "Repeat", [
    ["AD-L38-01", "Multistage", "High lift, 8 stage", 22, 24], ["AD-L38-02", "Multistage", "High lift, 8 stage", 10, 24]]],
  ["c5", "Nomsa Khoza", "Buyer", "Kiaat Coal", "Mining", "Delmas", 8, 64, 14, false, "Phone", [
    ["KC-PT-02", "Submersible", "Pit dewatering, 55 kW", 10, 12], ["KC-PT-03", "Submersible", "Pit dewatering, 55 kW", 4, 12]]],
  ["c6", "Sanjay Pillay", "Utilities Manager", "Drakens Paper Mill", "Manufacturing", "Springs", 3, 82, 37, false, "Repeat", [
    ["DP-CW-01", "Multistage", "Cooling water, 4 stage", 15, 18], ["DP-ST-08", "Slurry", "Stock pump, 150 mm", 11, 14]]],
  ["c7", "Ruth Adams", "Engineering Manager", "Copperleaf Chemicals", "Manufacturing", "Sasolburg", 1, 86, 48, true, "Referral", [
    ["CL-BF-01", "Multistage", "Boiler feed, 6 stage", 19, 20], ["CL-BF-02", "Multistage", "Boiler feed, 6 stage", 8, 20], ["CL-EF-03", "Submersible", "Effluent, 22 kW", 6, 12]]],
  ["c8", "Themba Nkosi", "Maintenance Lead", "Delmora Foods", "Manufacturing", "Boksburg", 6, 68, 19, false, "Website", [
    ["DF-CIP-02", "Multistage", "CIP supply, 3 stage", 10, 12]]],
  ["c9", "Ilse Botha", "Plant Manager", "Marulane Beverages", "Manufacturing", "Isando", 11, 59, 11, false, "Website", [
    ["MB-GL-01", "Multistage", "Glycol, 3 stage", 8, 12]]],
  ["c10", "Hennie Marais", "Owner", "Bergvallei Citrus", "Agriculture", "Groblersdal", 4, 77, 16, false, "WhatsApp", [
    ["BV-BH-01", "Submersible", "Borehole, 15 kW", 14, 16], ["BV-PK-01", "Multistage", "Packhouse, 4 stage", 12, 14]]],
  ["c11", "Lindiwe Zulu", "Farm Manager", "Suikerbos Pivot Farms", "Agriculture", "Bethal", 9, 66, 12, false, "WhatsApp", [
    ["SP-PV-03", "Multistage", "Pivot supply, 4 stage", 16, 18]]],
  ["c12", "Johan Kruger", "Owner", "Kareebos Dairy", "Agriculture", "Heidelberg", 13, 52, 7, false, "Phone", [
    ["KD-ML-01", "Submersible", "Slurry pit, 7.5 kW", 9, 12]]],
  ["c13", "Mandla Sithole", "Pump Station Supt", "Vaalkrans Water Works", "Water", "Vereeniging", 1, 90, 52, true, "Repeat", [
    ["VK-HL-01", "Multistage", "High lift, 5 stage", 23, 24], ["VK-HL-02", "Multistage", "High lift, 5 stage", 12, 24], ["VK-RS-05", "Submersible", "Raw sewage, 45 kW", 8, 12]]],
  ["c14", "Farah Ismail", "Process Controller", "Silverstream Wastewater", "Water", "Benoni", 0, 79, 28, false, "Phone", [
    ["SS-IN-02", "Submersible", "Inlet works, 30 kW", 11, 12], ["SS-RAS-1", "Submersible", "Return sludge, 18 kW", 5, 12]]],
  ["c15", "Grant Naidoo", "Facilities Manager", "Highveld Estate Utilities", "Water", "Midrand", 7, 61, 9, false, "Website", [
    ["HE-BS-01", "Multistage", "Booster set, 4 stage", 13, 18]]],
  ["c16", "Zanele Mabaso", "Technical Services", "Mopane Town Water", "Water", "Polokwane", 10, 70, 24, false, "Referral", [
    ["MT-BH-06", "Submersible", "Borehole, 30 kW", 17, 18], ["MT-VT-01", "Multistage", "Vertical turbine", 10, 24]]],
];

type D = [string, string, number, Stage, number, string[], Service, PumpType, Urgency, Source];
const OPEN: D[] = [
  ["Multistage, high vibration", "c1", 142000, "enquiry", 9, ["DV", "TM"], "Pump refurbishment", "Multistage", "breakdown", "Phone"],
  ["Dewatering pump refurb x3", "c2", 187300, "enquiry", 26, ["DV", "NP"], "Pump refurbishment", "Submersible", "planned", "Repeat"],
  ["Slurry pump wet end", "c3", 68400, "enquiry", 18, ["DV"], "Inspection & assessment", "Slurry", "planned", "Referral"],
  ["Impeller reconditioning, set of 4", "c6", 54200, "enquiry", 22, ["RG", "DV"], "Component reconditioning", "Multistage", "planned", "Repeat"],
  ["Booster set refurbishment", "c15", 96500, "enquiry", 31, ["NP"], "Pump refurbishment", "Multistage", "planned", "Website"],
  ["Volute vertical bore", "c5", 47900, "enquiry", 14, ["RG"], "Precision machining", "Submersible", "planned", "Phone"],
  ["Borehole pump refurb", "c10", 38600, "enquiry", 12, ["NP", "TM"], "Pump refurbishment", "Submersible", "planned", "WhatsApp"],
  ["Bearing housing line bore", "c8", 28700, "enquiry", 20, ["RG"], "Precision machining", "Multistage", "planned", "Website"],

  ["8 stage multistage overhaul", "c4", 412000, "inspect", 16, ["TM", "DV"], "Pump refurbishment", "Multistage", "planned", "Repeat"],
  ["Slurry pump full refurb", "c2", 236500, "inspect", 11, ["TM", "DV", "RG"], "Pump refurbishment", "Slurry", "planned", "Repeat"],
  ["Submersible seal failure", "c14", 58900, "inspect", 3, ["TM"], "Pump refurbishment", "Submersible", "breakdown", "Phone"],
  ["Boiler feed pump overhaul", "c7", 318400, "inspect", 24, ["DV", "TM"], "Pump refurbishment", "Multistage", "planned", "Referral"],
  ["Sewage pump wet end", "c13", 121600, "inspect", 19, ["TM", "RG"], "Component reconditioning", "Submersible", "planned", "Repeat"],
  ["Stage casing set, skim and bore", "c1", 88200, "inspect", 13, ["RG", "DV"], "Precision machining", "Multistage", "planned", "Repeat"],
  ["Pivot irrigation pump refurb", "c11", 64800, "inspect", 28, ["NP", "TM"], "Pump refurbishment", "Multistage", "planned", "WhatsApp"],

  ["Shutdown package, 6 pumps", "c7", 548000, "quoted", 34, ["DV", "TM", "NP"], "Pump refurbishment", "Multistage", "shutdown", "Referral"],
  ["5 stage multistage overhaul", "c13", 286000, "quoted", 15, ["DV", "TM"], "Pump refurbishment", "Multistage", "planned", "Repeat"],
  ["Vertical turbine bowl assembly", "c16", 205800, "quoted", 27, ["DV"], "Pump refurbishment", "Multistage", "planned", "Referral"],
  ["Slurry liners and impeller", "c3", 174600, "quoted", 10, ["DV", "RG"], "Component reconditioning", "Slurry", "planned", "Referral"],
  ["Cooling water pump refurb", "c6", 132400, "quoted", 17, ["NP", "DV"], "Pump refurbishment", "Multistage", "planned", "Repeat"],
  ["Discharge casing weld and bore", "c4", 76900, "quoted", 8, ["RG", "DV"], "Precision machining", "Multistage", "breakdown", "Repeat"],
  ["Shaft and sleeve machining", "c9", 41300, "quoted", 21, ["RG"], "Precision machining", "Multistage", "planned", "Website"],
  ["Dairy slurry pit pump refurb", "c12", 33500, "quoted", 23, ["NP"], "Pump refurbishment", "Submersible", "planned", "Phone"],

  ["High lift pump refurbishment", "c13", 264300, "po", 5, ["DV", "TM"], "Pump refurbishment", "Multistage", "planned", "Repeat"],
  ["Slurry pump refurb, unit 2", "c2", 221800, "po", 7, ["TM", "DV", "RG"], "Pump refurbishment", "Slurry", "planned", "Repeat"],
  ["Dewatering pump refurb x2", "c5", 148700, "po", 10, ["DV", "NP"], "Pump refurbishment", "Submersible", "planned", "Phone"],
  ["Packhouse pump refurb", "c10", 72900, "po", 6, ["NP", "TM"], "Pump refurbishment", "Multistage", "planned", "WhatsApp"],
  ["Wear ring and neck ring set", "c8", 52600, "po", 4, ["RG"], "Component reconditioning", "Multistage", "planned", "Website"],
  ["Bore and sleeve, DE housing", "c1", 36400, "po", 2, ["RG", "TM"], "Precision machining", "Multistage", "breakdown", "Repeat"],
];

/* This month's wins. Each one is a job on the workshop floor. */
type W = [string, string, number, number, string[], Service, PumpType, Urgency, Source, number, number, string, string, string];
const RECENT: W[] = [
  // title, customer, value, daysAgo, owners, service, pump, urgency, source, boltsDone, dueIn, machine, photo, part code
  ["6 stage multistage overhaul", "c6", 198400, 12, ["TM", "DV"], "Pump refurbishment", "Multistage", "planned", "Repeat", 3, 7, "Horizontal borer", "workshop", "orrrrrroro"],
  ["Slurry pump refurb, unit 1", "c2", 214600, 15, ["TM", "RG"], "Pump refurbishment", "Slurry", "planned", "Repeat", 4, 3, "Vertical borer", "casing", "rxxxxorror"],
  ["Raw sewage pump refurb", "c14", 96800, 4, ["TM"], "Pump refurbishment", "Submersible", "breakdown", "Phone", 3, 1, "Vertical borer", "casing", "oxrrxoxoror"],
  ["Boiler feed shaft and sleeves", "c7", 74500, 18, ["RG", "DV"], "Precision machining", "Multistage", "planned", "Referral", 5, 0, "Milling machine", "machining", "orxooororr"],
  ["Borehole pumps x2", "c11", 63700, 10, ["TM", "NP"], "Pump refurbishment", "Submersible", "planned", "WhatsApp", 4, 5, "Radial arm drill", "workshop", "oroorxoxroo"],
];

/* last number is the typical size of the job */
const PAST_TITLES: [string, Service, PumpType, number][] = [
  ["Multistage pump overhaul", "Pump refurbishment", "Multistage", 2.6],
  ["Slurry pump refurb", "Pump refurbishment", "Slurry", 1.9],
  ["Submersible pump refurb", "Pump refurbishment", "Submersible", 1.1],
  ["Impeller and wear ring set", "Component reconditioning", "Multistage", 0.8],
  ["Bearing housing bore and sleeve", "Precision machining", "Multistage", 0.4],
  ["Volute liner replacement", "Component reconditioning", "Slurry", 1],
  ["Shaft machining", "Precision machining", "Multistage", 0.5],
  ["Stage casing line bore", "Precision machining", "Multistage", 0.7],
  ["Strip, inspect and report", "Inspection & assessment", "Submersible", 0.16],
  ["Breakdown strip and rebuild", "Pump refurbishment", "Multistage", 1.8],
];
const LOST_WHY = ["Went with new pump", "Price", "Project postponed", "Lead time", "No reply"];

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
  const nextRef = () => `FQ-${++ref}`;
  const deals: Deal[] = [];

  /* history */
  MONTHLY.forEach((total, i) => {
    const back = 11 - i;
    const start = monthStart(t0, back);
    const days = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
    const n = 6 + Math.floor(r() * 4);
    /* every month touches all four industries, then leans to mining; work matches pumps they own */
    const buyers = Array.from({ length: n }, (_, k) => {
      const lean = r();
      const g = k < 4 ? SEGMENTS[(k + i) % 4] : lean < 0.45 ? "Mining" : lean < 0.72 ? "Manufacturing" : lean < 0.82 ? "Agriculture" : "Water";
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
      id: `FP-${++jobNo}`, dealId: id, customerId, title, pumpType, done, due: day(due), machine, urgency,
      photo, parts: partsFor(pumpType, code),
    });
  });
  [["Bowl assembly, 3 units", "c16", 118000, 6], ["Glycol pump refurb", "c9", 37200, 9]].forEach(([title, customerId, value, back]) => {
    deals.push({
      id: nextRef(), title: title as string, customerId: customerId as string, value: value as number, status: "lost",
      closes: inMonth(back as number), closedAt: inMonth(back as number), created: day(-(back as number) - 20), owners: ["DV"],
      service: "Pump refurbishment", pumpType: "Multistage", urgency: "planned", source: "Website", pos: 0, lostReason: "Went with new pump",
    });
  });

  /* open pipeline */
  OPEN.forEach(([title, customerId, value, status, closes, owners, service, pumpType, urgency, source], i) => {
    deals.push({
      id: nextRef(), title, customerId, value, status, closes: day(closes), created: day(-3 - ((i * 7) % 24)),
      owners, service, pumpType, urgency, source, pos: i * 10,
    });
  });
  /* pumps already stripped while the quote is being worked out */
  const onFloor: [string, number, number, string, string, string][] = [
    ["8 stage multistage overhaul", 2, 16, "Horizontal borer", "workshop", "orxrxrrror"],
    ["Slurry pump full refurb", 1, 11, "Vertical borer", "casing", "rxxxxrrror"],
    ["Submersible seal failure", 2, 3, "Radial arm drill", "casing", "oroorxxooro"],
  ];
  onFloor.forEach(([title, done, due, machine, photo, code]) => {
    const d = deals.find((x) => x.title === title && x.status === "inspect")!;
    jobs.push({
      id: `FP-${++jobNo}`, dealId: d.id, customerId: d.customerId, title, pumpType: d.pumpType, done, due: day(due),
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
    ["Collection", "Collect slurry pump, unit 2", "c2", 0, 7, 2.5, "TM"],
    ["Site visit", "Measure bearing housings", "c1", 0, 11, 2, "DV"],
    ["Inspection", "Strip 8 stage multistage", "c4", 1, 8, 3, "TM"],
    ["Site visit", "Booster set survey", "c15", 1, 13, 1.5, "NP"],
    ["Call-out", "Inlet pump tripped on seal leak", "c14", 1, 18.5, 2, "TM"],
    ["Delivery", "Deliver refurbished stock pump", "c6", 2, 7.5, 2, "RG"],
    ["Inspection", "Boiler feed strip report", "c7", 2, 10, 2, "DV"],
    ["Site visit", "Shutdown planning meeting", "c7", 2, 14, 2, "DV"],
    ["Collection", "Collect high lift pump", "c13", 3, 6.5, 3, "TM"],
    ["Inspection", "Liner thickness check", "c3", 3, 11, 1.5, "RG"],
    ["Site visit", "Pivot pump quote walk", "c11", 3, 14, 2, "NP"],
    ["Delivery", "Deliver raw sewage pump", "c14", 4, 8, 2, "RG"],
    ["Inspection", "Shaft runout, boiler feed", "c7", 4, 11, 1, "RG"],
    ["Site visit", "Bowl assembly handover talk", "c16", 4, 13, 2.5, "DV"],
    ["Call-out", "Weekend standby, pit pumps", "c5", 5, 8, 3, "TM"],
    ["Collection", "Collect dewatering pumps x2", "c5", 7, 7, 3, "TM"],
    ["Site visit", "Quarterly review", "c2", 8, 10, 2, "NP"],
    ["Delivery", "Deliver 6 stage multistage", "c6", 9, 8, 2, "RG"],
    ["Inspection", "Borehole pump strip", "c10", 10, 9, 2, "TM"],
    ["Site visit", "High lift installation check", "c13", -4, 9, 2, "DV"],
    ["Delivery", "Deliver wear ring set", "c8", -5, 11, 1.5, "RG"],
  ];
  const events: CalEvent[] = ev.map(([kind, title, customerId, off, start, hours, who], i) => ({
    id: `e${i}`, kind, title, customerId, date: iso(addDays(mon, off)), start, hours, who,
  }));

  const min = 60000;
  const at = (m: number) => now.getTime() - m * min;
  const find = (title: string) => deals.find((d) => d.title === title)?.id;
  const activity: Activity[] = [
    { id: "a1", who: "TM", text: "moved Raw sewage pump refurb to Machine", at: at(18), customerId: "c14" },
    { id: "a2", who: "DV", text: "sent the quote for Slurry liners and impeller", at: at(64), customerId: "c3", dealId: find("Slurry liners and impeller") },
    { id: "a3", who: "NP", text: "logged a call with Kagiso Molefe", at: at(141), customerId: "c2" },
    { id: "a4", who: "LJ", text: "matched a payment from Drakens Paper Mill", at: at(205), customerId: "c6" },
    { id: "a5", who: "RG", text: "finished boring the DE housing for Ironwood", at: at(322), customerId: "c1" },
    { id: "a6", who: "DV", text: "added a strip report to Boiler feed pump overhaul", at: at(1490), customerId: "c7", dealId: find("Boiler feed pump overhaul") },
    { id: "a7", who: "NP", text: "sent a WhatsApp update to Mandla Sithole", at: at(1620), customerId: "c13" },
  ];

  const inbox: InboxItem[] = [
    { id: "m1", channel: "Website", from: "Themba Nkosi, Delmora Foods", customerId: "c8", text: "CIP supply pump is losing pressure. Can you strip it this week and tell us what it needs?", at: at(26), service: "Pump refurbishment", pumpType: "Multistage", estimate: 61500, urgency: "planned", title: "CIP pump losing pressure", done: false },
    { id: "m2", channel: "WhatsApp", from: "Nomsa Khoza, Kiaat Coal", customerId: "c5", text: "Pit pump 3 is down since 04:00. Are you open tonight to receive it?", at: at(52), service: "Pump refurbishment", pumpType: "Submersible", estimate: 118000, urgency: "breakdown", title: "Pit pump 3 breakdown", done: false },
    { id: "m3", channel: "Email", from: "Ruth Adams, Copperleaf Chemicals", customerId: "c7", text: "Please quote six wear rings in bronze to the attached drawing.", at: at(188), service: "Precision machining", pumpType: "Multistage", estimate: 34800, urgency: "planned", title: "Bronze wear rings x6", done: false },
  ];

  return { seedDay: iso(t0), deals, customers, jobs, invoices, events, activity, inbox };
}

const today0 = (d: Date) => iso(d);
