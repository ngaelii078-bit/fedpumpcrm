import type { Condition, JobPart, PumpType } from "./types";

/**
 * Section drawing data. Each part is the upper half profile of a turned or cast
 * component, in drawing units, measured from the shaft centre line. The renderer
 * mirrors it, so every part reads as a full section.
 */
export type Pt = [number, number];
export type PartDef = {
  id: string;
  fig: string;
  name: string;
  kind: "cast" | "turned" | "wear";
  /** one or more closed upper half outlines */
  top: Pt[][];
  /** outlines that only exist above the centre line, such as a nozzle */
  above?: Pt[][];
  below?: Pt[][];
  /** exploded offset for each copy of the part, with the assembled x shift */
  copies: { ax: number; ex: number; ey?: number }[];
  findings: Record<Condition, string>;
};

const stage = (x: number): Pt[] => [
  [x, 104], [x + 54, 104], [x + 54, 90], [x + 14, 90], [x + 14, 34], [x, 34],
];
const impeller = (x: number): Pt[][] => [
  [[x, 22], [x + 34, 22], [x + 34, 30], [x + 26, 42], [x + 22, 80], [x + 16, 80], [x + 17, 44], [x + 6, 30], [x, 30]],
  [[x + 4, 48], [x + 10, 48], [x + 8, 80], [x + 2, 80]],
];

const multistage: PartDef[] = [
  {
    id: "coupling", fig: "01", name: "Coupling half", kind: "turned",
    top: [[[-372, 14], [-372, 40], [-356, 40], [-356, 26], [-326, 26], [-326, 14]]],
    copies: [{ ax: 0, ex: -262 }],
    findings: { reuse: "Keyway clean, runout in tolerance", recondition: "Keyway worn, re-cut one size up", replace: "Hub cracked at keyway" },
  },
  {
    id: "debrg", fig: "02", name: "DE bearing housing", kind: "cast",
    top: [[[-318, 24], [-318, 44], [-308, 58], [-246, 58], [-236, 44], [-236, 24], [-250, 24], [-250, 42], [-304, 42], [-304, 24]]],
    copies: [{ ax: 0, ex: -216 }],
    findings: { reuse: "Bore to drawing, re-grease", recondition: "Bore 0.18 mm oversize, bore and sleeve", replace: "Foot cracked through" },
  },
  {
    id: "seal", fig: "03", name: "Mechanical seal", kind: "wear",
    top: [[[-230, 18], [-230, 38], [-216, 38], [-216, 30], [-204, 30], [-204, 18]]],
    copies: [{ ax: 0, ex: -172 }],
    findings: { reuse: "Faces flat, within 2 light bands", recondition: "Faces scored, lap and refit", replace: "Faces chipped, fit new seal" },
  },
  {
    id: "suction", fig: "04", name: "Suction casing", kind: "cast",
    top: [[[-198, 30], [-198, 60], [-182, 112], [-118, 112], [-118, 92], [-168, 92], [-182, 56], [-182, 30]]],
    above: [[[-190, 112], [-190, 148], [-206, 148], [-206, 164], [-110, 164], [-110, 148], [-126, 148], [-126, 112], [-140, 112], [-140, 148], [-176, 148], [-176, 112]]],
    below: [[[-186, 112], [-198, 152], [-118, 152], [-130, 112]]],
    copies: [{ ax: 0, ex: -112 }],
    findings: { reuse: "Register face clean", recondition: "Register face pitted, skim 0.4 mm", replace: "Casing wall below minimum" },
  },
  {
    id: "impeller", fig: "05", name: "Impellers, set of 3", kind: "turned",
    top: impeller(0),
    copies: [{ ax: -100, ex: -105 }, { ax: -46, ex: -29 }, { ax: 8, ex: 47 }],
    findings: { reuse: "Vanes sound, balance and refit", recondition: "Neck rings worn, build up and machine", replace: "Vane tips eroded, cast new set" },
  },
  {
    id: "stage", fig: "06", name: "Stage casings, set of 3", kind: "cast",
    top: [stage(0)],
    copies: [{ ax: -118, ex: -35 }, { ax: -64, ex: 41 }, { ax: -10, ex: 117 }],
    findings: { reuse: "Spigots to size", recondition: "Spigots fretted, line bore the set", replace: "One casing cracked at tie bolt" },
  },
  {
    id: "discharge", fig: "07", name: "Discharge casing", kind: "cast",
    top: [[[46, 34], [46, 104], [58, 114], [120, 114], [136, 60], [136, 30], [120, 30], [120, 56], [108, 94], [60, 94], [60, 34]]],
    above: [[[56, 114], [56, 148], [40, 148], [40, 164], [132, 164], [132, 148], [116, 148], [116, 114], [102, 114], [102, 148], [70, 148], [70, 114]]],
    below: [[[60, 114], [48, 152], [128, 152], [116, 114]]],
    copies: [{ ax: 0, ex: 138 }],
    findings: { reuse: "Pressure face clean", recondition: "Bore washed out, weld and re-bore", replace: "Nozzle flange cracked" },
  },
  {
    id: "drum", fig: "08", name: "Balance drum", kind: "wear",
    top: [[[144, 18], [144, 52], [178, 52], [178, 18]]],
    copies: [{ ax: 0, ex: 186 }],
    findings: { reuse: "Clearance 0.25 mm, in limit", recondition: "Grooved, skim and re-sleeve", replace: "Scored through, machine new" },
  },
  {
    id: "ndebrg", fig: "09", name: "NDE bearing housing", kind: "cast",
    top: [[[190, 24], [190, 44], [200, 58], [264, 58], [276, 46], [276, 14], [264, 14], [264, 42], [204, 42], [204, 24]]],
    copies: [{ ax: 0, ex: 236 }],
    findings: { reuse: "Bore to drawing", recondition: "Bore worn taper, bore and sleeve", replace: "Cap register broken" },
  },
  {
    id: "shaft", fig: "10", name: "Shaft", kind: "turned",
    top: [[[-372, 0], [-372, 13], [-320, 13], [-320, 17], [-232, 17], [-232, 20], [186, 20], [186, 16], [262, 16], [262, 0]]],
    copies: [{ ax: 0, ex: 0, ey: 214 }],
    findings: { reuse: "Runout 0.02 mm, polish journals", recondition: "Journals worn, sleeve and grind", replace: "Bent 0.31 mm, machine new in EN19" },
  },
];

const slurry: PartDef[] = [
  {
    id: "cover", fig: "01", name: "Cover plate", kind: "cast",
    top: [[[-262, 48], [-262, 66], [-248, 66], [-248, 148], [-228, 160], [-216, 160], [-216, 142], [-230, 136], [-230, 48]]],
    copies: [{ ax: 0, ex: -310 }],
    findings: { reuse: "Bolt holes sound", recondition: "Suction face worn, build up and skim", replace: "Cracked at cover bolt" },
  },
  {
    id: "throat", fig: "02", name: "Throatbush", kind: "wear",
    top: [[[-224, 44], [-224, 60], [-206, 60], [-206, 122], [-192, 122], [-192, 52], [-208, 44]]],
    copies: [{ ax: 0, ex: -232 }],
    findings: { reuse: "8 mm face left", recondition: "Uneven wear, rotate and reface", replace: "Worn through at eye" },
  },
  {
    id: "volute", fig: "03", name: "Volute liner", kind: "wear",
    top: [[[-206, 122], [-206, 150], [-190, 162], [-92, 162], [-76, 150], [-76, 122], [-90, 122], [-96, 144], [-186, 144], [-192, 122]]],
    above: [[[-170, 162], [-176, 196], [-192, 196], [-192, 210], [-90, 210], [-90, 196], [-106, 196], [-112, 162], [-124, 162], [-120, 196], [-162, 196], [-158, 162]]],
    copies: [{ ax: 0, ex: -140 }],
    findings: { reuse: "Wall 22 mm, 60% life left", recondition: "Cutwater worn, weld profile", replace: "Holed at cutwater" },
  },
  {
    id: "impeller", fig: "04", name: "Impeller, 5 vane", kind: "wear",
    top: [
      [[-186, 48], [-176, 48], [-172, 110], [-182, 110]],
      [[-112, 0], [-112, 40], [-104, 110], [-94, 110], [-92, 30], [-84, 30], [-84, 0]],
    ],
    copies: [{ ax: 0, ex: 2 }],
    findings: { reuse: "Vanes 14 mm, balance and refit", recondition: "Expelling vanes worn, build up", replace: "Vane tips gone, fit new" },
  },
  {
    id: "fpl", fig: "05", name: "Frame plate liner", kind: "wear",
    top: [[[-80, 34], [-80, 122], [-66, 122], [-66, 34]]],
    copies: [{ ax: 0, ex: 36 }],
    findings: { reuse: "Even wear, refit", recondition: "Stud face worn, reface", replace: "Below minimum thickness" },
  },
  {
    id: "frame", fig: "06", name: "Frame plate", kind: "cast",
    top: [[[-62, 46], [-62, 160], [-44, 172], [-30, 172], [-30, 150], [-42, 140], [-42, 64], [-10, 64], [-10, 46]]],
    below: [[[-58, 168], [-70, 206], [-4, 206], [-22, 168]]],
    copies: [{ ax: 0, ex: 72 }],
    findings: { reuse: "Register clean", recondition: "Register corroded, skim and bore", replace: "Foot broken off" },
  },
  {
    id: "expeller", fig: "07", name: "Expeller", kind: "wear",
    top: [[[-38, 22], [-38, 88], [-26, 88], [-26, 44], [-14, 34], [-14, 22]]],
    copies: [{ ax: 0, ex: 140 }],
    findings: { reuse: "Vanes sound", recondition: "Bore worn, sleeve", replace: "Vanes worn flat" },
  },
  {
    id: "gland", fig: "08", name: "Gland and packing", kind: "wear",
    top: [[[-6, 24], [-6, 56], [10, 56], [10, 36], [28, 36], [28, 24]]],
    copies: [{ ax: 0, ex: 158 }],
    findings: { reuse: "Gland clean, repack", recondition: "Stuffing box scored, bore and bush", replace: "Gland studs stripped" },
  },
  {
    id: "bearing", fig: "09", name: "Bearing assembly", kind: "cast",
    top: [[[46, 26], [46, 62], [60, 74], [222, 74], [236, 62], [236, 26], [220, 26], [220, 56], [62, 56], [62, 26]]],
    below: [[[70, 74], [58, 112], [226, 112], [214, 74]]],
    copies: [{ ax: 0, ex: 196 }],
    findings: { reuse: "Bearings quiet, re-grease", recondition: "Housing bore worn, sleeve", replace: "Bearings collapsed" },
  },
  {
    id: "shaft", fig: "10", name: "Shaft and sleeve", kind: "turned",
    top: [[[-110, 0], [-110, 18], [-40, 18], [-40, 22], [40, 22], [40, 26], [240, 26], [240, 18], [306, 18], [306, 0]]],
    copies: [{ ax: 0, ex: 40, ey: 252 }],
    findings: { reuse: "Thread and journals clean", recondition: "Sleeve grooved, machine new sleeve", replace: "Impeller thread stripped" },
  },
];

const submersible: PartDef[] = [
  {
    id: "strainer", fig: "01", name: "Strainer and base", kind: "cast",
    top: [[[-330, 20], [-330, 108], [-316, 108], [-316, 98], [-262, 98], [-262, 86], [-316, 86], [-316, 20]]],
    copies: [{ ax: 0, ex: -262 }],
    findings: { reuse: "Clean and refit", recondition: "Base bent, straighten and weld", replace: "Corroded through" },
  },
  {
    id: "wear", fig: "02", name: "Wear ring", kind: "wear",
    top: [[[-256, 44], [-256, 62], [-240, 62], [-240, 44]]],
    copies: [{ ax: 0, ex: -206 }],
    findings: { reuse: "Clearance 0.4 mm", recondition: "Ovality, skim and re-ring", replace: "Clearance 2.1 mm, machine new" },
  },
  {
    id: "volute", fig: "03", name: "Volute casing", kind: "cast",
    top: [[[-254, 66], [-254, 120], [-236, 136], [-166, 136], [-150, 120], [-150, 92], [-164, 92], [-174, 118], [-228, 118], [-238, 66]]],
    above: [[[-224, 136], [-224, 176], [-240, 176], [-240, 192], [-160, 192], [-160, 176], [-176, 176], [-176, 136], [-188, 136], [-188, 176], [-212, 176], [-212, 136]]],
    copies: [{ ax: 0, ex: -140 }],
    findings: { reuse: "Wall sound", recondition: "Cutwater eroded, weld and profile", replace: "Holed by grit" },
  },
  {
    id: "impeller", fig: "04", name: "Impeller", kind: "turned",
    top: [
      [[-236, 46], [-226, 46], [-214, 100], [-224, 100]],
      [[-186, 0], [-186, 40], [-192, 100], [-180, 100], [-170, 34], [-160, 34], [-160, 0]],
    ],
    copies: [{ ax: 0, ex: -62 }],
    findings: { reuse: "Balanced, refit", recondition: "Eye worn, build up and machine", replace: "Vane broken" },
  },
  {
    id: "lseal", fig: "05", name: "Lower seal", kind: "wear",
    top: [[[-146, 20], [-146, 46], [-130, 46], [-130, 34], [-116, 34], [-116, 20]]],
    copies: [{ ax: 0, ex: -18 }],
    findings: { reuse: "Faces good", recondition: "Lap faces", replace: "Faces cracked, fit new" },
  },
  {
    id: "oil", fig: "06", name: "Oil chamber", kind: "cast",
    top: [[[-140, 60], [-140, 112], [-56, 112], [-56, 24], [-70, 24], [-70, 96], [-126, 96], [-126, 60]]],
    copies: [{ ax: 0, ex: 24 }],
    findings: { reuse: "No water in oil", recondition: "Register fretted, skim", replace: "Cracked web" },
  },
  {
    id: "useal", fig: "07", name: "Upper seal", kind: "wear",
    top: [[[-50, 20], [-50, 42], [-36, 42], [-36, 20]]],
    copies: [{ ax: 0, ex: 62 }],
    findings: { reuse: "Dry, refit", recondition: "Lap faces", replace: "Leaked, fit new" },
  },
  {
    id: "stator", fig: "08", name: "Stator housing", kind: "cast",
    top: [[[-30, 70], [-30, 116], [196, 116], [196, 100], [176, 100], [176, 70], [0, 70], [0, 100], [-14, 100], [-14, 70]]],
    copies: [{ ax: 0, ex: 108 }],
    findings: { reuse: "Insulation test passed", recondition: "Spigot worn, bore and sleeve", replace: "Services ingress, send for rewind" },
  },
  {
    id: "bearing", fig: "09", name: "Top bearing cover", kind: "cast",
    top: [[[202, 20], [202, 112], [226, 112], [226, 74], [246, 60], [246, 20], [232, 20], [232, 52], [214, 62], [214, 20]]],
    copies: [{ ax: 0, ex: 150 }],
    findings: { reuse: "Bearing quiet", recondition: "Bearing bore worn, sleeve", replace: "Cover cracked" },
  },
  {
    id: "cable", fig: "10", name: "Cable entry", kind: "turned",
    top: [[[254, 0], [254, 30], [270, 30], [270, 20], [304, 20], [304, 0]]],
    copies: [{ ax: 0, ex: 192 }],
    findings: { reuse: "Gland tight", recondition: "New gland rubber", replace: "Cable damaged, fit new" },
  },
  {
    id: "rotor", fig: "11", name: "Rotor and shaft", kind: "turned",
    top: [[[-200, 0], [-200, 14], [-120, 14], [-120, 19], [4, 19], [4, 62], [170, 62], [170, 19], [228, 19], [228, 0]]],
    copies: [{ ax: 0, ex: 30, ey: 228 }],
    findings: { reuse: "Runout 0.03 mm", recondition: "Seal journal grooved, sleeve", replace: "Shaft sheared at impeller" },
  },
];

export const PUMPS: Record<PumpType, PartDef[]> = {
  Domestic: multistage,
  International: slurry,
  Freight: submersible,
};

const KEY: Record<string, Condition> = { o: "reuse", r: "recondition", x: "replace" };

/** "rrxoor..." gives one condition per part in drawing order */
export function partsFor(type: PumpType, code: string): JobPart[] {
  return PUMPS[type].map((p, i) => {
    const condition = KEY[code[i] ?? "r"];
    return { id: p.id, condition, note: p.findings[condition] };
  });
}
