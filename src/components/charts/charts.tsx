"use client";
import { useId, useRef, useState, KeyboardEvent, PointerEvent, ReactNode } from "react";
import gsap from "gsap";
import { reduced, useIso, useWidth } from "../ui/bits";

const niceMax = (v: number) => {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (v <= m * p) return m * p;
  return 10 * p;
};

/* monotone cubic so the line never overshoots a real value */
function smooth(pts: [number, number][]) {
  const n = pts.length;
  if (n < 2) return "";
  const dx: number[] = [], m: number[] = [], t: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i]);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const right = x > w * 0.62;
  return (
    <div className="ctip" role="status" style={{ transform: `translate(${right ? "calc(-100% - 12px)" : "12px"}, -50%) `, left: x, top: Math.max(30, y) }}>
      {children}
    </div>
  );
}

/* ---------- line with area, target and crosshair ---------- */
export function LineArea({ data, target, height = 220, color, format, axis, name, max, min = 0 }: {
  data: { label: string; value: number; note?: string }[]; target?: number; height?: number; color: string;
  format: (n: number) => string; axis: (n: number) => string; name: string; max?: number; min?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const clip = useId().replace(/:/g, "");
  const rect = useRef<SVGRectElement>(null);
  const L = 46, R = 12, T = 14, B = 26;
  const top = max ?? niceMax(Math.max(target ?? 0, ...data.map((d) => d.value)) * 1.02);
  const x = (i: number) => L + (i * (w - L - R)) / Math.max(1, data.length - 1);
  const y = (v: number) => T + (1 - (v - min) / (top - min)) * (height - T - B);
  const pts = data.map((d, i) => [x(i), y(d.value)] as [number, number]);
  const line = w ? smooth(pts) : "";
  const key = data.map((d) => d.value).join();
  useIso(() => {
    if (!rect.current || !w || reduced()) return;
    gsap.set(rect.current, { scaleX: 1, transformOrigin: "0% 50%" });
    const tw = gsap.from(rect.current, { scaleX: 0, duration: 1.1, ease: "power3.out" });
    return () => {
      tw.progress(1).kill();
    };
  }, [key, w > 0]);
  const move = (e: PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    const i = Math.round(((e.clientX - b.left - L) / (w - L - R)) * (data.length - 1));
    setHi(Math.max(0, Math.min(data.length - 1, i)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") setHi((h) => Math.min(data.length - 1, (h ?? -1) + 1));
    else if (e.key === "ArrowLeft") setHi((h) => Math.max(0, (h ?? data.length) - 1));
    else if (e.key === "Escape") setHi(null);
    else return;
    e.preventDefault();
  };
  const ticks = [min, min + (top - min) / 2, top];
  const every = w < 460 ? Math.ceil(data.length / 5) : w < 620 && data.length > 8 ? 2 : 1;
  const last = data.length - 1;
  return (
    <div className="chart" ref={ref} style={{ height }} tabIndex={0} role="img"
      aria-label={`${name}. ${data.map((d) => `${d.label} ${format(d.value)}`).join(", ")}`}
      onPointerMove={move} onPointerLeave={() => setHi(null)} onKeyDown={onKey} onBlur={() => setHi(null)}>
      {w > 0 && (
        <svg height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs><clipPath id={clip}><rect ref={rect} x={L - 8} y={0} width={w - L + 16} height={height} /></clipPath></defs>
          {ticks.map((t) => (
            <g key={t}>
              <line className="grid-l" x1={L} x2={w - R} y1={y(t)} y2={y(t)} />
              <text x={L - 10} y={y(t) + 4} textAnchor="end">{axis(t)}</text>
            </g>
          ))}
          {data.map((d, i) => ((last - i) % every === 0 ? (
            <text key={d.label + i} x={x(i)} y={height - 5} textAnchor={i === last ? "end" : i === 0 ? "start" : "middle"} style={hi === i ? { fill: "var(--ink)" } : undefined}>{d.label}</text>
          ) : null))}
          {target !== undefined && <line x1={L} x2={w - R} y1={y(target)} y2={y(target)} stroke="var(--chart-strong)" strokeWidth="1.5" strokeDasharray="5 4" />}
          <g clipPath={`url(#${clip})`}>
            <path d={`${line}L${x(last)},${y(min)}L${x(0)},${y(min)}Z`} fill={color} opacity="0.13" />
            <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {hi === null && <circle cx={x(last)} cy={y(data[last].value)} r="5" fill={color} stroke="var(--chart-dot)" strokeWidth="2" />}
          {hi !== null && (
            <g>
              <line x1={x(hi)} x2={x(hi)} y1={T} y2={height - B} stroke="var(--chart-guide)" />
              <circle cx={x(hi)} cy={y(data[hi].value)} r="5.5" fill={color} stroke="var(--chart-dot)" strokeWidth="2" />
            </g>
          )}
        </svg>
      )}
      {hi !== null && w > 0 && (
        <Tip x={x(hi)} y={y(data[hi].value)} w={w}>
          <div className="row"><span className="k" style={{ background: color }} /><b>{format(data[hi].value)}</b><span className="muted">{data[hi].label}{data[hi].note ? `, ${data[hi].note}` : ""}</span></div>
          {target !== undefined && <div className="row muted"><span className="k" style={{ background: "var(--chart-strong)" }} /><b>{Math.round((data[hi].value / target) * 100)}%</b> of target</div>}
        </Tip>
      )}
    </div>
  );
}

/* ---------- stacked columns on dim tracks ---------- */
export function Stacked({ data, keys, colors, height = 260, format, axis, percent, name }: {
  data: { label: string; values: Record<string, number> }[]; keys: readonly string[]; colors: Record<string, string>;
  height?: number; format: (n: number) => string; axis: (n: number) => string; percent?: boolean; name: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const g = useRef<SVGGElement>(null);
  const L = 46, R = 4, T = 10, B = 26;
  const totals = data.map((d) => keys.reduce((a, k) => a + (d.values[k] || 0), 0));
  const top = percent ? 100 : niceMax(Math.max(...totals) * 1.04);
  const ph = height - T - B;
  const band = (w - L - R) / data.length;
  const bw = Math.min(64, band * 0.74);
  const y = (v: number) => T + (1 - v / top) * ph;
  const key = JSON.stringify(data) + percent;
  useIso(() => {
    if (!g.current || !w || reduced()) return;
    const els = g.current.querySelectorAll("[data-bar]");
    gsap.set(els, { scaleY: 1, transformOrigin: "50% 100%" });
    const tw = gsap.from(els, { scaleY: 0, duration: 0.95, ease: "power3.out", stagger: 0.05 });
    return () => {
      tw.progress(1).kill();
    };
  }, [key, w > 0]);
  return (
    <div className="chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg height={height} viewBox={`0 0 ${w} ${height}`} role="group" aria-label={name}>
          {[0, 0.5, 1].map((f) => (
            <g key={f}>
              <line className="grid-l" x1={L} x2={w - R} y1={y(top * f)} y2={y(top * f)} />
              <text x={L - 10} y={y(top * f) + 4} textAnchor="end">{percent ? `${top * f}%` : axis(top * f)}</text>
            </g>
          ))}
          <g ref={g}>
            {data.map((d, i) => {
              const cx = L + band * (i + 0.5);
              let acc = 0;
              const segs = keys.filter((k) => d.values[k] > 0).map((k) => {
                const v = percent ? (d.values[k] / totals[i]) * 100 : d.values[k];
                const s = { k, y0: y(acc), y1: y(acc + v) };
                acc += v;
                return s;
              });
              return (
                <g key={d.label + i} tabIndex={0} role="img" aria-label={`${d.label}: ${format(totals[i])}. ${keys.map((k) => `${k} ${format(d.values[k] || 0)}`).join(", ")}`}
                  onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)} style={{ outline: "none" }}>
                  <rect x={cx - band / 2} y={T} width={band} height={ph + B} fill="transparent" />
                  <rect x={cx - bw / 2} y={T} width={bw} height={ph} rx="6" fill={hi === i ? "var(--chart-guide)" : "var(--chart-track)"} />
                  <g data-bar>
                    {segs.map((s, j) => {
                      const lastSeg = j === segs.length - 1;
                      const h = Math.max(0, s.y0 - s.y1 - (lastSeg ? 0 : 2));
                      const yy = lastSeg ? s.y1 : s.y1 + 2;
                      const r = lastSeg ? Math.min(5, h / 2) : 0;
                      const x0 = cx - bw / 2, x1 = cx + bw / 2;
                      return <path key={s.k} d={`M${x0},${yy + h}V${yy + r}Q${x0},${yy} ${x0 + r},${yy}H${x1 - r}Q${x1},${yy} ${x1},${yy + r}V${yy + h}Z`} fill={colors[s.k]} opacity={hi === null || hi === i ? 1 : 0.55} />;
                    })}
                  </g>
                  <text x={cx} y={height - 5} textAnchor="middle" style={i === data.length - 1 || hi === i ? { fill: "var(--ink)", fontWeight: 600 } : undefined}>{d.label}</text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
      {hi !== null && w > 0 && (
        <Tip x={L + band * (hi + 0.5)} y={height * 0.4} w={w}>
          <div className="row"><b>{format(totals[hi])}</b><span className="muted">{data[hi].label}</span></div>
          {[...keys].reverse().map((k) => (
            <div className="row" key={k}><span className="k" style={{ background: colors[k] }} /><b>{format(data[hi].values[k] || 0)}</b><span className="muted">{k}</span></div>
          ))}
        </Tip>
      )}
    </div>
  );
}

/* ---------- simple columns ---------- */
export function Cols({ data, height = 170, color, format, axis, name, colors }: {
  data: { label: string; value: number }[]; height?: number; color: string; colors?: string[]; format: (n: number) => string; axis?: (n: number) => string; name: string;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hi, setHi] = useState<number | null>(null);
  const g = useRef<SVGGElement>(null);
  const L = axis ? 46 : 2, R = 4, T = 24, B = 26;
  const top = niceMax(Math.max(1, ...data.map((d) => d.value)));
  const ph = height - T - B;
  const band = (w - L - R) / data.length;
  const bw = Math.min(44, band * 0.6);
  const y = (v: number) => T + (1 - v / top) * ph;
  const key = data.map((d) => d.value).join();
  const peak = data.reduce((a, d, i) => (d.value > data[a].value ? i : a), 0);
  useIso(() => {
    if (!g.current || !w || reduced()) return;
    const els = g.current.querySelectorAll("[data-bar]");
    gsap.set(els, { scaleY: 1, transformOrigin: "50% 100%" });
    const tw = gsap.from(els, { scaleY: 0, duration: 0.9, ease: "power3.out", stagger: 0.05 });
    return () => {
      tw.progress(1).kill();
    };
  }, [key, w > 0]);
  return (
    <div className="chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg height={height} viewBox={`0 0 ${w} ${height}`} role="group" aria-label={name}>
          {axis && [0, 0.5, 1].map((f) => (
            <g key={f}>
              <line className="grid-l" x1={L} x2={w - R} y1={y(top * f)} y2={y(top * f)} />
              <text x={L - 10} y={y(top * f) + 4} textAnchor="end">{axis(top * f)}</text>
            </g>
          ))}
          {!axis && <line className="grid-l" x1={L} x2={w - R} y1={y(0)} y2={y(0)} />}
          <g ref={g}>
            {data.map((d, i) => {
              const cx = L + band * (i + 0.5);
              const h = Math.max(d.value > 0 ? 3 : 0, y(0) - y(d.value));
              const r = Math.min(4, h / 2);
              const x0 = cx - bw / 2, x1 = cx + bw / 2, yy = y(0) - h;
              return (
                <g key={d.label + i} tabIndex={0} role="img" aria-label={`${d.label}: ${format(d.value)}`} style={{ outline: "none" }}
                  onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(null)} onFocus={() => setHi(i)} onBlur={() => setHi(null)}>
                  <rect x={cx - band / 2} y={0} width={band} height={height} fill="transparent" />
                  <path data-bar d={`M${x0},${yy + h}V${yy + r}Q${x0},${yy} ${x0 + r},${yy}H${x1 - r}Q${x1},${yy} ${x1},${yy + r}V${yy + h}Z`} fill={colors?.[i] ?? color} opacity={hi === null || hi === i ? 1 : 0.6} />
                  {(hi === i || (hi === null && i === peak && d.value > 0)) && <text x={cx} y={yy - 8} textAnchor="middle" style={{ fill: "var(--ink)", fontWeight: 600 }}>{format(d.value)}</text>}
                  <text x={cx} y={height - 5} textAnchor="middle">{d.label}</text>
                </g>
              );
            })}
          </g>
        </svg>
      )}
    </div>
  );
}

/* ---------- donut ---------- */
export function Donut({ data, size = 190, center, label, name }: {
  data: { key: string; value: number; color: string }[]; size?: number; center: string; label: string; name: string;
}) {
  const [hi, setHi] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const total = data.reduce((a, d) => a + d.value, 0) || 1;
  const r = 42, c = 2 * Math.PI * r, gap = 1.6;
  let acc = 0;
  const key = data.map((d) => d.value).join();
  useIso(() => {
    if (!ref.current || reduced()) return;
    const arcs = ref.current.querySelectorAll<SVGCircleElement>("[data-arc]");
    const tw = gsap.fromTo(arcs, { attr: { "stroke-dasharray": `0 ${c}` } }, {
      attr: { "stroke-dasharray": (i: number, el: Element) => el.getAttribute("data-len") as string }, duration: 0.9, ease: "power3.out", stagger: 0.08,
    });
    return () => {
      tw.progress(1).kill();
    };
  }, [key]);
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <svg ref={ref} viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={`${name}. ${data.map((d) => `${d.key} ${d.value}`).join(", ")}`}>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--chart-track)" strokeWidth="11" />
        {data.map((d, i) => {
          const len = Math.max(0, (d.value / total) * c - gap);
          const off = -acc;
          acc += (d.value / total) * c;
          const dash = `${len} ${c - len}`;
          return (
            <circle key={d.key} data-arc data-len={dash} cx="50" cy="50" r={r} fill="none" stroke={d.color} strokeWidth={hi === i ? 13 : 11} strokeDasharray={dash} strokeDashoffset={off}
              transform="rotate(-90 50 50)" opacity={hi === null || hi === i ? 1 : 0.5} onPointerEnter={() => setHi(i)} onPointerLeave={() => setHi(null)} />
          );
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeContent: "center", textAlign: "center", pointerEvents: "none" }}>
        <span className="display" style={{ fontSize: 26, fontWeight: 600, lineHeight: 1.1 }}>{hi === null ? center : data[hi].value}</span>
        <span className="muted" style={{ fontSize: 12 }}>{hi === null ? label : data[hi].key}</span>
      </div>
    </div>
  );
}

/* ---------- horizontal bars with the value at the tip ---------- */
export function HBars({ data, color, format }: { data: { label: string; value: number }[]; color: string; format: (n: number) => string }) {
  const ref = useRef<HTMLDivElement>(null);
  const top = Math.max(1, ...data.map((d) => d.value));
  const key = data.map((d) => d.value).join();
  useIso(() => {
    if (!ref.current || reduced()) return;
    const tw = gsap.fromTo(ref.current.querySelectorAll("[data-bar]"), { scaleX: 0 }, { scaleX: 1, transformOrigin: "0% 50%", duration: 0.9, ease: "power3.out", stagger: 0.07 });
    return () => {
      tw.progress(1).kill();
    };
  }, [key]);
  return (
    <div ref={ref} style={{ display: "grid", gap: 13 }}>
      {data.map((d) => (
        <div key={d.label}>
          <div className="small" style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span className="muted">{d.label}</span><b className="tnum" style={{ fontWeight: 600 }}>{format(d.value)}</b>
          </div>
          <div style={{ height: 10, borderRadius: 4, background: "var(--chart-track)" }}>
            <div data-bar style={{ height: 10, width: `${(d.value / top) * 100}%`, background: color, borderRadius: "0 4px 4px 0" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DataTable({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <div className="scrollx" style={{ maxHeight: 270, overflowY: "auto" }} data-lenis-prevent>
      <table className="tbl">
        <thead><tr>{head.map((h, i) => <th key={h} className={i ? "r" : ""}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? "r" : ""}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
