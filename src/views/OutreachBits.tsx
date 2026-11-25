"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Check, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { SIGN, STOP_LINE, contactOf, merge, mergeText, mergeVars, presend } from "@/lib/outreach";
import { useStore } from "@/lib/store";
import type { AudienceKey, CampaignStep, Recipient } from "@/lib/types";
import { Count, reduced, useIso, useWidth } from "@/components/ui/bits";

const Merged = ({ text, vars }: { text: string; vars: Record<string, string> }) => (
  <>{merge(text, vars).map((x, i) => (x.m ? <mark key={i}>{x.t}</mark> : x.bad ? <mark key={i} className="bad">{x.t}</mark> : <span key={i}>{x.t}</span>))}</>
);

/** The email as one real person will read it. Flip through the list to check every one. */
export function Paper({ step, list }: { step: CampaignStep; list: Recipient[] }) {
  const { s } = useStore();
  const [i, setI] = useState(0);
  const body = useRef<HTMLDivElement>(null);
  const n = list.length;
  const at = Math.min(i, Math.max(0, n - 1));
  const r = list[at];
  useEffect(() => setI(0), [n]);
  useIso(() => {
    if (body.current && !reduced()) gsap.fromTo(body.current, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out", clearProps: "transform,opacity" });
  }, [at, r?.id]);
  if (!r) return null;
  const k = contactOf(s, r.id);
  const v = mergeVars(s, r);
  const go = (d: number) => setI((at + d + n) % n);
  return (
    <div className="paper" role="group" aria-label={`Email to ${k?.name}`}>
      <div className="phead2">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="prow"><span>To</span><b>{k?.name}</b> <span className="pmail">{k?.email}</span></div>
          <div className="prow"><span>Subject</span><b><Merged text={step.subject} vars={v} /></b></div>
        </div>
        <div className="pnav">
          <button type="button" onClick={() => go(-1)} aria-label="Previous person"><ChevronLeft size={16} /></button>
          <span className="tnum">{at + 1} of {n}</span>
          <button type="button" onClick={() => go(1)} aria-label="Next person"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="pbody" ref={body} aria-live="polite">
        <div style={{ whiteSpace: "pre-wrap" }}><Merged text={step.body} vars={v} /></div>
        <div className="psign">
          {SIGN.map((l) => <div key={l}>{l}</div>)}
          <div style={{ marginTop: 10 }}>{STOP_LINE}</div>
        </div>
      </div>
      <span className="sr">{mergeText(step.subject, v)}</span>
    </div>
  );
}

export function Presend({ step, audience, first }: { step: CampaignStep; audience: AudienceKey; first: boolean }) {
  const c = presend(step, audience, first);
  return (
    <div className="check" aria-live="polite">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <b style={{ fontWeight: 600 }}>Pre-send check</b>
        <span className={"chip " + (c.ok ? "green" : "orange")}>{c.ok ? "Ready" : `${c.rows.filter((r) => !r.ok).length} to fix`}</span>
      </div>
      <ul>
        {c.rows.map((r) => (
          <li key={r.label + r.hint} className={r.ok ? "" : "no"}>
            {r.ok ? <Check size={14} /> : <CircleAlert size={14} />}
            <span>{r.label}{!r.ok && r.hint ? <em>{r.hint}</em> : null}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * People emailed to orders, drawn as a reducing pipe. Diameter goes with the
 * square root, so the bore area is the number.
 */
export function Pipe({ stages }: { stages: { label: string; value: number; show?: string }[] }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const g = useRef<SVGRectElement>(null);
  const H = 118, mid = H / 2, max = Math.max(1, stages[0]?.value ?? 1);
  const R = (v: number) => (v > 0 ? 7 + 41 * Math.sqrt(Math.min(1, v / max)) : 3);
  const sw = w / Math.max(1, stages.length);
  const taper = Math.min(34, sw * 0.22);
  const key = stages.map((s) => s.value).join();
  let top = "", bot = "";
  stages.forEach((s, i) => {
    const r = R(s.value), x0 = i * sw + (i ? taper / 2 : 0), x1 = (i + 1) * sw - (i < stages.length - 1 ? taper / 2 : 0);
    top += `${i ? "L" : "M"}${x0},${mid - r}L${x1},${mid - r}`;
    bot = `L${x1},${mid + r}L${x0},${mid + r}` + bot;
  });
  useIso(() => {
    if (!g.current || !w || reduced()) return;
    gsap.set(g.current, { scaleX: 1, transformOrigin: "0% 50%" });
    const tw = gsap.from(g.current, { scaleX: 0, duration: 1.1, ease: "power3.out" });
    return () => {
      tw.progress(1).kill();
    };
  }, [key, w > 0]);
  return (
    <div ref={ref}>
      {w > 0 && (
        <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} role="img" aria-label={stages.map((s) => `${s.label} ${s.show ?? s.value}`).join(", ")} style={{ display: "block" }}>
          <defs>
            <linearGradient id="pipeg" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#6d5330" /><stop offset="0.32" stopColor="#edb771" /><stop offset="0.6" stopColor="#8f6a38" /><stop offset="1" stopColor="#3d2d18" />
            </linearGradient>
            <clipPath id="pipec"><rect ref={g} x="-6" y="0" width={w + 12} height={H} /></clipPath>
          </defs>
          <g clipPath="url(#pipec)">
            <path d={top + bot + "Z"} fill="url(#pipeg)" />
            {stages.slice(0, -1).map((s, i) => {
              const a = R(s.value) + 7, b = R(stages[i + 1].value) + 7, x = (i + 1) * sw;
              return (
                <g key={s.label}>
                  <rect x={x - taper / 2 - 5} y={mid - a} width="5" height={a * 2} rx="1.5" fill="#f3f0e9" opacity="0.92" />
                  <rect x={x + taper / 2} y={mid - b} width="5" height={b * 2} rx="1.5" fill="#f3f0e9" opacity="0.92" />
                </g>
              );
            })}
            <line x1="0" x2={w} y1={mid} y2={mid} stroke="rgba(17,35,51,.75)" strokeDasharray="20 5 4 5" />
          </g>
        </svg>
      )}
      <div className="pipelab" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
        {stages.map((s) => (
          <div key={s.label}><b className="display">{s.show ?? <Count value={s.value} format={(n) => String(Math.round(n))} />}</b><span>{s.label}</span></div>
        ))}
      </div>
    </div>
  );
}
