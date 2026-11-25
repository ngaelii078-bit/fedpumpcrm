"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { PUMPS, PartDef, Pt } from "@/lib/pumps";
import type { Condition, Job } from "@/lib/types";
import { reduced } from "@/components/ui/bits";

export const COND: Record<Condition, { name: string; color: string; icon: string }> = {
  reuse: { name: "Reuse", color: "#A9CDEF", icon: "M5 12l5 5L20 7" },
  recondition: { name: "Recondition", color: "#EDB771", icon: "M4 12a8 8 0 0 1 14-5l2 2M20 4v5h-5M20 12a8 8 0 0 1-14 5l-2-2M4 20v-5h5" },
  replace: { name: "Replace", color: "#FF8D6E", icon: "M6 6l12 12M18 6L6 18" },
};

const VW = 1420;
const VH = 600;

const path = (pts: Pt[], flip = 1) => "M" + pts.map(([x, y]) => `${x},${-y * flip}`).join("L") + "Z";
/* a profile that reaches the centre line is one solid bar */
const isSolid = (pts: Pt[]) => pts.some((p) => p[1] === 0);
const solidPath = (pts: Pt[]) => {
  const t = pts.filter((p) => p[1] > 0);
  return "M" + [...t.map(([x, y]) => `${x},${-y}`), ...[...t].reverse().map(([x, y]) => `${x},${y}`)].join("L") + "Z";
};
const steps = (pts: Pt[]) => {
  const out: Pt[] = [];
  for (let i = 1; i < pts.length; i++) if (pts[i][0] === pts[i - 1][0] && pts[i][1] && pts[i - 1][1]) out.push([pts[i][0], Math.min(pts[i][1], pts[i - 1][1])]);
  return out;
};
const ends = (pts: Pt[]) => {
  const xs = pts.map((p) => p[0]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const r = (x: number) => Math.min(...pts.filter((p) => p[0] === x).map((p) => p[1]));
  return { x0, x1, r0: r(x0), r1: r(x1) };
};

function bounds(defs: PartDef[], t: number) {
  let a = Infinity, b = -Infinity, c = Infinity, d = -Infinity;
  for (const p of defs)
    for (const k of p.copies) {
      const ox = k.ax + k.ex * t, oy = (k.ey ?? 0) * t;
      for (const [x, y] of p.top.flat()) {
        a = Math.min(a, x + ox); b = Math.max(b, x + ox);
        c = Math.min(c, oy - y); d = Math.max(d, oy + y);
      }
      for (const [, y] of (p.above ?? []).flat()) c = Math.min(c, oy - y);
      for (const [, y] of (p.below ?? []).flat()) d = Math.max(d, oy + y);
    }
  return { a, b, c, d };
}

/** Section drawing that comes apart along the shaft as t goes from 0 to 1. */
export function PumpSection({ job, t, active, onActive }: { job: Job; t: number; active: string | null; onActive: (id: string | null) => void }) {
  const defs = PUMPS[job.pumpType];
  const order = useMemo(() => [...defs].sort((a, b) => Number(!!b.copies[0].ey) - Number(!!a.copies[0].ey)), [defs]);
  const topMax = useMemo(() => Math.max(...defs.filter((p) => !p.copies[0].ey).flatMap((p) => [...p.top, ...(p.above ?? [])].flat().map((q) => q[1]))), [defs]);
  const labels = Math.max(0, Math.min(1, (t - 0.5) / 0.4));
  const bx = bounds(defs, t);
  const y0 = bx.c - 46 * labels, y1 = bx.d + 30 * labels;
  const scale = Math.min(1.5, (VW - 90) / (bx.b - bx.a), (VH - 44) / (y1 - y0));
  const cx = VW / 2 - (scale * (bx.a + bx.b)) / 2;
  const cy = VH / 2 - (scale * (y0 + y1)) / 2;

  const draw = (p: PartDef) => {
    const jp = job.parts.find((x) => x.id === p.id);
    const cond = jp?.condition ?? "reuse";
    const c = COND[cond].color;
    const on = active === p.id;
    const ink = t > 0.12 ? c : "rgba(226,233,239,.85)";
    const mid = p.copies[Math.floor(p.copies.length / 2)];
    const allX = p.top.flat().map((q) => q[0]);
    const lx = (Math.min(...allX) + Math.max(...allX)) / 2 + mid.ax + mid.ex * t;
    const shaft = !!mid.ey;
    const tip = Math.max(...[...p.top, ...(p.above ?? [])].flat().map((q) => q[1]));
    return (
      <g key={p.id} className="part" tabIndex={0} role="button" aria-label={`Figure ${p.fig}, ${p.name}: ${COND[cond].name}. ${jp?.note}`} opacity={active && !on ? 0.38 : 1}
        onPointerEnter={() => onActive(p.id)} onPointerLeave={() => onActive(null)} onFocus={() => onActive(p.id)} onBlur={() => onActive(null)}>
        {p.copies.map((k, n) => (
          <g key={n} transform={`translate(${k.ax + k.ex * t} ${(k.ey ?? 0) * t})`}>
            {t > 0.4 && <rect x={Math.min(...allX)} width={Math.max(...allX) - Math.min(...allX)} y={-tip} height={tip * 2} fill="transparent" />}
            {p.top.map((s, m) => {
              if (isSolid(s)) return null;
              const e = ends(s);
              return (
                <g key={"b" + m} pointerEvents="none">
                  <rect x={e.x0} width={e.x1 - e.x0} y={-Math.min(e.r0, e.r1)} height={Math.min(e.r0, e.r1) * 2} fill="url(#bore)" opacity={0.25 + 0.75 * t} />
                  <path d={`M${e.x0},${-e.r0}V${e.r0}M${e.x1},${-e.r1}V${e.r1}`} stroke={ink} strokeWidth="1" opacity={0.2 + 0.35 * t} />
                </g>
              );
            })}
            {p.top.map((s, m) =>
              isSolid(s) ? (
                <g key={m}>
                  <path className="o" d={solidPath(s)} fill="#232f39" stroke={ink} strokeWidth={on ? 2.6 : 1.7} strokeLinejoin="round" />
                  <path d={solidPath(s)} fill="url(#bar)" pointerEvents="none" />
                  <path d={solidPath(s)} fill={c} opacity={on ? 0.3 : 0.1} pointerEvents="none" />
                  {steps(s).map(([x, r], i) => <line key={i} x1={x} x2={x} y1={-r} y2={r} stroke={ink} strokeWidth="1" opacity="0.5" />)}
                </g>
              ) : (
                [1, -1].map((f) => (
                  <g key={m + "" + f}>
                    <path className="o" d={path(s, f)} fill={c} fillOpacity={on ? 0.5 : 0.1 + 0.1 * t} stroke={ink} strokeWidth={on ? 2.6 : 1.7} strokeLinejoin="round" />
                    {p.kind !== "turned" && <path d={path(s, f)} fill={p.kind === "cast" ? "url(#hatch)" : "url(#dots)"} opacity={0.6} pointerEvents="none" />}
                  </g>
                ))
              ),
            )}
            {[...(p.above ?? []).map((s) => [s, 1] as const), ...(p.below ?? []).map((s) => [s, -1] as const)].map(([s, f], m) => (
              <g key={"x" + m}>
                <path className="o" d={path(s, f)} fill={c} fillOpacity={on ? 0.5 : 0.1 + 0.1 * t} stroke={ink} strokeWidth={on ? 2.6 : 1.7} strokeLinejoin="round" />
                <path d={path(s, f)} fill={p.kind === "wear" ? "url(#dots)" : "url(#hatch)"} opacity={0.6} pointerEvents="none" />
              </g>
            ))}
          </g>
        ))}
        {labels > 0 && (
          <g opacity={labels} pointerEvents="none">
            {shaft ? (
              <text x={lx} y={(mid.ey ?? 0) * t + tip + 24} textAnchor="middle" className="fig" style={on ? { fill: c } : undefined}>{p.fig}</text>
            ) : (
              <>
                <line x1={lx} x2={lx} y1={-tip - 8} y2={-topMax - 18} stroke={c} strokeWidth="1" opacity="0.55" />
                <text x={lx} y={-topMax - 24} textAnchor="middle" className="fig" style={on ? { fill: c } : undefined}>{p.fig}</text>
              </>
            )}
          </g>
        )}
      </g>
    );
  };

  return (
    <div className="dscroll">
      <svg viewBox={`0 0 ${VW} ${VH}`} role="group" aria-label={`Section drawing, ${job.pumpType} pump`} style={{ aspectRatio: `${VW}/${VH}` }}>
        <defs>
          <pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="7" stroke="rgba(243,240,233,.5)" strokeWidth="1" /></pattern>
          <pattern id="dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="0.9" fill="rgba(243,240,233,.6)" /></pattern>
          <linearGradient id="bore" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="-90" y2="90">
            <stop offset="0" stopColor="#dfe8ee" stopOpacity="0.02" /><stop offset="0.36" stopColor="#dfe8ee" stopOpacity="0.2" /><stop offset="0.62" stopColor="#dfe8ee" stopOpacity="0.05" /><stop offset="1" stopColor="#dfe8ee" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="bar" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#e6eef3" stopOpacity="0.05" /><stop offset="0.34" stopColor="#e6eef3" stopOpacity="0.5" /><stop offset="0.7" stopColor="#e6eef3" stopOpacity="0.08" /><stop offset="1" stopColor="#000" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
          {order.map(draw)}
          <line x1={bx.a - 24} x2={bx.b + 24} y1="0" y2="0" stroke="rgba(237,183,113,.7)" strokeWidth="1" strokeDasharray="22 5 4 5" pointerEvents="none" />
        </g>
      </svg>
    </div>
  );
}

/** Slider value that also plays itself once so the idea is obvious. */
export function useStrip(key: string) {
  const [t, setT] = useState(0);
  const cur = useRef(0);
  const tw = useRef<gsap.core.Tween | null>(null);
  const put = (v: number) => {
    cur.current = v;
    setT(v);
  };
  const play = (to: number, delay = 0) => {
    tw.current?.kill();
    if (reduced()) return put(to);
    const o = { v: cur.current };
    tw.current = gsap.to(o, { v: to, duration: 1.4, delay, ease: "power3.out", onUpdate: () => put(o.v) });
  };
  useEffect(() => {
    put(0);
    play(1, 0.55);
    return () => {
      tw.current?.kill();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return {
    t,
    set: (v: number) => {
      tw.current?.kill();
      put(v);
    },
    play: (to: number) => play(to),
  };
}
