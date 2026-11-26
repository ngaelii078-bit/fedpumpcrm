"use client";
import { CSSProperties, ReactNode, useEffect, useLayoutEffect, useRef, useState } from "react";
import gsap from "gsap";
import { TEAM } from "@/lib/data";

export const reduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Number that rolls from its last value to the new one. */
export function Count({ value, format }: { value: number; format: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced() || last.current === value) {
      el.textContent = format(value);
      last.current = value;
      return;
    }
    const o = { v: last.current };
    const tw = gsap.to(o, {
      v: value,
      duration: 1.1,
      ease: "power3.out",
      onUpdate: () => {
        el.textContent = format(o.v);
      },
    });
    last.current = value;
    return () => {
      tw.kill();
      el.textContent = format(value);
    };
  }, [value]);
  return <span ref={ref} suppressHydrationWarning>{format(0)}</span>;
}

export function Avatar({ id, size = 26 }: { id: string; size?: number }) {
  const m = TEAM.find((t) => t.id === id);
  return (
    <span className="av" title={m ? `${m.name}, ${m.role}` : id} style={{ width: size, height: size, background: m?.tone ?? "#d8dde1", fontSize: size * 0.385 }}>
      {id}
    </span>
  );
}
export const Avatars = ({ ids, size = 25 }: { ids: string[]; size?: number }) => (
  <span className="avs">{ids.map((i) => <Avatar key={i} id={i} size={size} />)}</span>
);

const SEG_TONE: Record<string, string> = { Mining: "#F4D9B4", Manufacturing: "#C4DDF2", Engineering: "#F3C7B5", Contractors: "#CBE6D5" };
export const Initials = ({ name, segment, size = 46 }: { name: string; segment: string; size?: number }) => (
  <span className="av" style={{ width: size, height: size, background: SEG_TONE[segment], fontSize: size * 0.33 }}>
    {name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
  </span>
);

/** Six milestones in the workshop process. */
const STAR = [0, 1, 2, 3, 4, 5];
export function Flange({ done, size = 44, children, ring = true, color = "var(--gold)" }: {
  done: number; size?: number; children?: ReactNode; ring?: boolean; color?: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const prev = useRef<number | null>(null);
  useIso(() => {
    const svg = ref.current;
    if (!svg) return;
    const from = prev.current ?? 0;
    prev.current = done;
    if (reduced() || done <= from) return;
    const els = STAR.slice(from, Math.ceil(done)).map((i) => svg.querySelector(`[data-b="${i}"]`)).filter(Boolean);
    const tw = gsap.fromTo(els, { scale: 0.3, rotation: -150, transformOrigin: "50% 50%" }, {
      scale: 1, rotation: 0, duration: 0.55, ease: "power3.out", stagger: 0.13, clearProps: "transform",
    });
    return () => {
      tw.progress(1).kill();
    };
  }, [done]);
  const R = 50;
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-grid", placeItems: "center", flex: "none" }}>
      <svg ref={ref} viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        {ring && <circle cx="50" cy="50" r="48" fill="none" stroke="var(--chart-guide)" strokeWidth="2.4" />}
        {ring && <circle cx="50" cy="50" r="24" fill="none" stroke="var(--chart-guide)" strokeWidth="2" />}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (Math.PI / 3) * i - Math.PI / 2;
          const x = 50 + R * 0.72 * Math.cos(a);
          const y = 50 + R * 0.72 * Math.sin(a);
          const on = STAR.indexOf(i) < Math.floor(done);
          return on ? (
            <circle key={i} data-b={i} cx={x} cy={y} r="7" fill={color} />
          ) : (
            <circle key={i} data-b={i} cx={x} cy={y} r="6.2" fill="var(--chart-track)" stroke="var(--chart-guide)" strokeWidth="1.8" />
          );
        })}
      </svg>
      {children && <span style={{ position: "relative" }}>{children}</span>}
    </span>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: {
  value: T; options: readonly (T | { v: T; l: string })[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => {
        const v = typeof o === "string" ? o : o.v;
        const l = typeof o === "string" ? o : o.l;
        return (
          <button key={v} type="button" aria-pressed={v === value} onClick={() => onChange(v)}>{l}</button>
        );
      })}
    </div>
  );
}

export function Panel({ title, sub, actions, children, className = "", style, enter = true }: {
  title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; style?: CSSProperties; enter?: boolean;
}) {
  return (
    <section className={"panel " + className} style={style} data-enter={enter || undefined}>
      {(title || actions) && (
        <div className="phd">
          {title && <h2>{title}</h2>}
          {sub && <span className="sub">{sub}</span>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export type Kpi = { icon: ReactNode; value: number; format: (n: number) => string; label: string; chip?: ReactNode };
export function PageHead({ a, b, kpis, right }: { a: string; b: string; kpis: Kpi[]; right?: ReactNode }) {
  return (
    <header className="phead">
      <h1 className="ptitle" aria-label={`${a} ${b}`}>
        <span className="ln" aria-hidden="true"><span data-line>{a}</span></span>
        <span className="ln" aria-hidden="true"><span data-line>{b}</span></span>
      </h1>
      <div className="kpis">
        {kpis.map((k) => (
          <div className="kpi" key={k.label} data-enter>
            <span className="ic" aria-hidden="true">{k.icon}</span>
            <div style={{ minWidth: 0 }}>
              <div className="n"><Count value={k.value} format={k.format} />{k.chip}</div>
              <div className="l">{k.label}</div>
            </div>
          </div>
        ))}
      </div>
      {right}
    </header>
  );
}

/** Entrance for a page: title lines rise, panels follow. */
export function useEnter() {
  const ref = useRef<HTMLDivElement>(null);
  useIso(() => {
    if (!ref.current || reduced()) return;
    const ctx = gsap.context(() => {
      gsap.from("[data-line]", { yPercent: 110, duration: 0.9, ease: "power3.out", stagger: 0.08 });
      gsap.from("[data-enter]", { y: 22, opacity: 0, duration: 0.75, ease: "power3.out", stagger: 0.05, delay: 0.06, clearProps: "transform,opacity" });
    }, ref);
    return () => ctx.revert();
  }, []);
  return ref;
}

export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useIso(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="muted small" style={{ padding: "22px 6px", textAlign: "center" }}>{children}</p>;
}
