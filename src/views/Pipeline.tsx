"use client";
import { PointerEvent as RPointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { CalendarClock, Download, Plus, Search, TrendingUp, Trophy, X } from "lucide-react";
import { STAGES, TEAM, probOf, stageOf } from "@/lib/data";
import { downloadCsv, fmtDay, today, zar, zarK } from "@/lib/format";
import { inMonth, isOpen, sum, useStore, weighted } from "@/lib/store";
import type { Deal, DealStatus, Stage } from "@/lib/types";
import { Avatar, Avatars, Count, Empty, Flange, PageHead, Seg, reduced, useEnter } from "@/components/ui/bits";
import { DealCard } from "@/components/DealCard";

type Over = { to: DealStatus; index: number } | null;

export default function Pipeline() {
  const { s, setOpen, moveDeal, customer } = useStore();
  const root = useEnter();
  const [view, setView] = useState<"Board" | "List">("Board");
  const [q, setQ] = useState("");
  const [who, setWho] = useState<string[]>([]);
  const [lift, setLift] = useState<{ id: string; h: number } | null>(null);
  const [over, setOver] = useState<Over>(null);
  const [landing, setLanding] = useState<string | null>(null);

  const open = s.deals.filter(isOpen);
  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return open.filter((d) => {
      const c = customer(d.customerId);
      const text = `${d.id} ${d.title} ${c?.company} ${c?.contact} ${d.pumpType} ${d.service}`.toLowerCase();
      return (!t || text.includes(t)) && (!who.length || d.owners.some((o) => who.includes(o)));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.deals, s.customers, q, who]);
  const col = useCallback((st: Stage) => shown.filter((d) => d.status === st).sort((a, b) => a.pos - b.pos), [shown]);

  const closing = open.filter((d) => inMonth(d.closes, new Date()));
  const won = s.deals.filter((d) => d.status === "won" && inMonth(d.closedAt, new Date()));
  const lost = s.deals.filter((d) => d.status === "lost" && inMonth(d.closedAt, new Date()));

  /* ---------------- drag ---------------- */
  const board = useRef<HTMLDivElement>(null);
  const drag = useRef<{
    id: string; ghost: HTMLElement; dx: number; dy: number; x: number; y: number; px: number; rot: number; over: Over; raf: number; start: DOMRect;
  } | null>(null);
  const flip = useRef<Map<string, DOMRect> | null>(null);
  const land = useRef<{ id: string; ghost: HTMLElement } | null>(null);
  const colRef = useRef(col);
  colRef.current = col;

  const hitTest = useCallback((x: number, y: number, mid: number, id: string): Over => {
    const els = document.elementsFromPoint(x, y);
    const well = els.find((e) => (e as HTMLElement).dataset?.drop) as HTMLElement | undefined;
    const zone = well ?? (els.map((e) => e.closest<HTMLElement>("[data-drop]")).find(Boolean) as HTMLElement | undefined);
    if (!zone) return null;
    const to = zone.dataset.drop as DealStatus;
    if (to === "won" || to === "lost") return { to, index: 0 };
    const cards = [...zone.querySelectorAll<HTMLElement>("[data-deal]")].filter((c) => c.dataset.deal !== id);
    let index = cards.length;
    for (let i = 0; i < cards.length; i++) {
      const b = cards[i].getBoundingClientRect();
      if (mid < b.top + b.height / 2) {
        index = i;
        break;
      }
    }
    return { to, index };
  }, []);

  const tick = useCallback(() => {
    const d = drag.current;
    if (!d) return;
    const vx = d.x - d.px;
    d.px = d.x;
    const want = Math.max(-3, Math.min(3, vx * 0.35));
    d.rot += (want - d.rot) * 0.14;
    gsap.set(d.ghost, { x: d.x - d.dx, y: d.y - d.dy, rotation: reduced() ? 0 : d.rot });
    /* edge scroll */
    const under = document.elementsFromPoint(d.x, d.y).map((e) => e.closest<HTMLElement>(".colbd")).find(Boolean);
    if (under) {
      const b = under.getBoundingClientRect();
      if (d.y < b.top + 46) under.scrollTop -= 9;
      else if (d.y > b.bottom - 46) under.scrollTop += 9;
    }
    const bd = board.current;
    if (bd && bd.scrollWidth > bd.clientWidth + 4) {
      const b = bd.getBoundingClientRect();
      if (d.x < b.left + 44) bd.scrollLeft -= 11;
      else if (d.x > b.right - 44) bd.scrollLeft += 11;
    }
    const o = hitTest(d.x, d.y, d.y - d.dy + d.start.height / 2, d.id);
    if (o?.to !== d.over?.to || o?.index !== d.over?.index) {
      d.over = o;
      setOver(o);
    }
    d.raf = requestAnimationFrame(tick);
  }, [hitTest]);

  const snapRects = () => {
    const m = new Map<string, DOMRect>();
    board.current?.querySelectorAll<HTMLElement>("[data-deal]").forEach((e) => m.set(e.dataset.deal!, e.getBoundingClientRect()));
    flip.current = m;
  };

  const endDrag = useCallback((cancel: boolean) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    cancelAnimationFrame(d.raf);
    document.body.classList.remove("dragging");
    const deal = s.deals.find((x) => x.id === d.id)!;
    const o = cancel ? null : d.over;
    if (!o) {
      const back = document.querySelector<HTMLElement>(`[data-deal="${d.id}"]:not(.dragghost)`)?.getBoundingClientRect() ?? d.start;
      setOver(null);
      gsap.to(d.ghost, {
        x: back.left, y: back.top, rotation: 0, duration: reduced() ? 0 : 0.4, ease: "power3.out",
        onComplete: () => { d.ghost.remove(); setLift(null); },
      });
      return;
    }
    if (o.to === "won" || o.to === "lost") {
      const b = document.querySelector<HTMLElement>(`[data-drop="${o.to}"]`)!.getBoundingClientRect();
      const g = d.ghost.getBoundingClientRect();
      gsap.to(d.ghost, {
        x: b.left + b.width / 2 - g.width / 2, y: b.top + b.height / 2 - g.height / 2, scale: 0.25, opacity: 0, rotation: 0, duration: reduced() ? 0 : 0.38, ease: "power3.out",
        onComplete: () => d.ghost.remove(),
      });
      snapRects();
      setOver(null);
      setLift(null);
      moveDeal(d.id, o.to);
      return;
    }
    const list = colRef.current(o.to as Stage).filter((x) => x.id !== d.id);
    const a = list[o.index - 1]?.pos, b = list[o.index]?.pos;
    const pos = a === undefined && b === undefined ? 0 : a === undefined ? b! - 10 : b === undefined ? a + 10 : (a + b) / 2;
    snapRects();
    land.current = { id: d.id, ghost: d.ghost };
    setLanding(d.id);
    setOver(null);
    setLift(null);
    if (deal.status === o.to && deal.pos === pos) setLanding(d.id);
    moveDeal(d.id, o.to, pos);
  }, [moveDeal, s.deals]);

  /* after the drop: neighbours close up, the card settles */
  useLayoutEffect(() => {
    const m = flip.current;
    if (m && board.current && !reduced()) {
      board.current.querySelectorAll<HTMLElement>("[data-deal]").forEach((e) => {
        const a = m.get(e.dataset.deal!);
        if (!a || e.dataset.deal === land.current?.id) return;
        const b = e.getBoundingClientRect();
        const dx = a.left - b.left, dy = a.top - b.top;
        if (Math.abs(dx) + Math.abs(dy) > 1) gsap.fromTo(e, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.45, ease: "power3.out", clearProps: "transform" });
      });
    }
    flip.current = null;
    const l = land.current;
    if (l) {
      land.current = null;
      const t = board.current?.querySelector<HTMLElement>(`[data-deal="${l.id}"]`);
      const b = t?.getBoundingClientRect();
      const done = () => {
        l.ghost.remove();
        setLanding(null);
      };
      if (!b || reduced()) return done();
      gsap.to(l.ghost, { x: b.left, y: b.top, width: b.width, rotation: 0, duration: 0.42, ease: "power3.out", onComplete: done });
    }
  }, [s.deals]);

  const onDown = useCallback((e: RPointerEvent<HTMLDivElement>, deal: Deal) => {
    if (e.button !== 0) return;
    const el = e.currentTarget;
    const sx = e.clientX, sy = e.clientY, touch = e.pointerType === "touch";
    let started = false;
    let timer = 0;
    const begin = (x: number, y: number) => {
      started = true;
      const r = el.getBoundingClientRect();
      const ghost = el.cloneNode(true) as HTMLElement;
      ghost.classList.add("dragghost");
      ghost.removeAttribute("data-deal");
      ghost.setAttribute("aria-hidden", "true");
      ghost.style.width = r.width + "px";
      document.body.appendChild(ghost);
      gsap.set(ghost, { x: r.left, y: r.top });
      if (!reduced()) gsap.fromTo(ghost, { scale: 1 }, { scale: 1.035, duration: 0.25, ease: "power3.out" });
      document.body.classList.add("dragging");
      el.dataset.moved = "1";
      drag.current = { id: deal.id, ghost, dx: sx - r.left, dy: sy - r.top, x, y, px: x, rot: 0, over: null, raf: 0, start: r };
      setLift({ id: deal.id, h: r.height });
      drag.current.raf = requestAnimationFrame(tick);
    };
    const move = (ev: PointerEvent) => {
      if (!started) {
        const far = Math.hypot(ev.clientX - sx, ev.clientY - sy);
        if (touch) {
          if (far > 9) stop();
          return;
        }
        if (far < 6) return;
        begin(ev.clientX, ev.clientY);
      }
      if (drag.current) {
        drag.current.x = ev.clientX;
        drag.current.y = ev.clientY;
      }
    };
    const block = (ev: TouchEvent) => {
      if (started) ev.preventDefault();
    };
    const key = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        stop();
        endRef.current(true);
      }
    };
    const up = () => {
      const was = started;
      stop();
      if (was) endRef.current(false);
    };
    const cancel = () => {
      const was = started;
      stop();
      if (was) endRef.current(true);
    };
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("keydown", key);
      window.removeEventListener("touchmove", block);
      setTimeout(() => delete el.dataset.moved, 60);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("keydown", key);
    window.addEventListener("touchmove", block, { passive: false });
    if (touch) timer = window.setTimeout(() => begin(sx, sy), 260);
  }, [tick]);
  const endRef = useRef(endDrag);
  endRef.current = endDrag;

  useEffect(() => () => {
    if (drag.current) {
      cancelAnimationFrame(drag.current.raf);
      drag.current.ghost.remove();
      document.body.classList.remove("dragging");
    }
  }, []);

  const csv = () => downloadCsv(`lexbridge-pipeline-${today()}.csv`, [
    ["Ref", "Title", "Customer", "Stage", "Value excl VAT", "Weighted", "Closes"],
    ...shown.map((d) => [d.id, d.title, customer(d.customerId)?.company, stageOf(d.status)!.name, d.value, Math.round(d.value * probOf(d.status)), fmtDay(d.closes)]),
  ]);

  return (
    <div ref={root}>
      <PageHead
        a="Quote"
        b="pipeline"
        kpis={[
          { icon: <Trophy size={18} />, value: sum(open), format: zar, label: "Open pipeline" },
          { icon: <TrendingUp size={18} />, value: weighted(open), format: zar, label: "Weighted forecast" },
          { icon: <CalendarClock size={18} />, value: closing.length, format: (n) => Math.round(n).toString(), label: "Closing this month", chip: closing.length ? <span className="chip blue">{zarK(sum(closing))}</span> : undefined },
        ]}
      />
      <div className="toolbar" data-enter>
        <label className="field wide" style={{ width: 250 }}><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search quotes" aria-label="Search quotes" /></label>
        {TEAM.slice(0, 4).map((m) => (
          <button key={m.id} className="tag who" aria-pressed={who.includes(m.id)} onClick={() => setWho((w) => (w.includes(m.id) ? w.filter((x) => x !== m.id) : [...w, m.id]))}>
            <Avatar id={m.id} size={24} /> {m.name}
          </button>
        ))}
        <span className="grow" />
        <Seg label="View" value={view} options={["Board", "List"] as const} onChange={setView} />
        <button className="iconbtn" aria-label="Export CSV" onClick={csv}><Download size={17} /></button>
        <button className="btn gold" onClick={() => setOpen({ k: "newDeal" })}><Plus size={16} /> New enquiry</button>
      </div>

      {view === "Board" ? (
        <div className="boardwrap" data-enter>
          <div className="board" ref={board}>
            {STAGES.map((st) => {
              const list = col(st.id);
              const rest = lift ? list.filter((d) => d.id !== lift.id) : list;
              const isOver = over?.to === st.id;
              const items: (Deal | "slot")[] = [...list];
              if (isOver && lift) {
                const before = rest[over!.index];
                const at = before ? items.indexOf(before) : items.length;
                items.splice(at, 0, "slot");
              }
              return (
                <section key={st.id} className={"col" + (isOver ? " over" : "")} data-drop={st.id} aria-label={`${st.name}, ${list.length} quotes`}>
                  <div className="colhd">
                    <span className="d" style={{ background: st.dot }} />
                    <span className="nm">{st.name}</span>
                    <span className="ct">{list.length}</span>
                    <span className="sm"><Count value={sum(list)} format={zarK} /></span>
                  </div>
                  <div className="colbd" data-lenis-prevent>
                    {list.length === 0 && !isOver && <Empty>{q || who.length ? "No match in this stage." : "Drop a quote here."}</Empty>}
                    {items.map((d) =>
                      d === "slot" ? (
                        <div key="slot" className="slot" style={{ height: lift!.h }} />
                      ) : (
                        <DealCard key={d.id} deal={d} tone className={(lift?.id === d.id ? "lifted" : "") + (landing === d.id ? " landing" : "")} onPointerDown={(e) => onDown(e, d)} />
                      ),
                    )}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="wells">
            <div className={"wellbox won" + (over?.to === "won" ? " over" : "")} data-drop="won">
              <Flange done={Math.min(6, won.length)} size={64}><Trophy size={15} /></Flange>
              <span className="nm">Won</span>
              <span className="small muted">{won.length} this month</span>
              <b className="display" style={{ fontWeight: 600 }}><Count value={sum(won)} format={zarK} /></b>
            </div>
            <div className={"wellbox lost" + (over?.to === "lost" ? " over" : "")} data-drop="lost">
              <span style={{ width: 52, height: 52, borderRadius: 99, display: "grid", placeItems: "center", background: "var(--well)" }}><X size={18} className="muted" /></span>
              <span className="nm">Lost</span>
              <span className="small muted">{lost.length} this month</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="panel scrollx" style={{ padding: 6 }}>
          <table className="tbl" style={{ minWidth: 820 }}>
            <thead><tr><th>Ref</th><th>Quote</th><th>Customer</th><th>Stage</th><th>Closes</th><th>Owners</th><th className="r">Value</th><th className="r">Weighted</th></tr></thead>
            <tbody>
              {[...shown].sort((a, b) => b.value * probOf(b.status) - a.value * probOf(a.status)).map((d) => (
                <tr key={d.id} data-click onClick={() => setOpen({ k: "deal", id: d.id })}>
                  <td className="mono muted">{d.id}</td>
                  <td><button style={{ textAlign: "left", fontWeight: 500 }} onClick={(e) => { e.stopPropagation(); setOpen({ k: "deal", id: d.id }); }}>{d.title}</button></td>
                  <td className="muted">{customer(d.customerId)?.company}</td>
                  <td><span style={{ display: "inline-flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}><span className="sw" style={{ background: stageOf(d.status)!.dot }} />{stageOf(d.status)!.name}</span></td>
                  <td className="muted" style={{ whiteSpace: "nowrap" }}>{fmtDay(d.closes)}</td>
                  <td style={{ paddingLeft: 19 }}><Avatars ids={d.owners} /></td>
                  <td className="r">{zar(d.value)}</td>
                  <td className="r muted">{zar(d.value * probOf(d.status))}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown.length === 0 && <Empty>No quotes match that search.</Empty>}
        </div>
      )}
    </div>
  );
}
