"use client";
import { MouseEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import gsap from "gsap";
import Lenis from "lenis";
import {
  Banknote, Bell, CalendarDays, ChartColumn, Factory, Globe, Inbox, KanbanSquare, LayoutDashboard, Mail, Menu, Reply,
  MessageCircle, Moon, Phone, Plus, RotateCcw, Search, Send, Siren, Sun, Upload, Users, Wrench,
} from "lucide-react";
import { ME, stageOf } from "@/lib/data";
import { ago, daysBetween, downloadCsv, fmtDay, today, zarK } from "@/lib/format";
import { VAT, isOpen, nextRefurb, useStore } from "@/lib/store";
import { Avatar, Empty, reduced, useIso } from "../ui/bits";
import { Overlays } from "./Overlays";
import { lenisTop, setLenis } from "./lenis";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/pipeline/", label: "Pipeline", icon: KanbanSquare },
  { href: "/customers/", label: "Customers", icon: Users },
  { href: "/outreach/", label: "Outreach", icon: Send },
  { href: "/schedule/", label: "Schedule", icon: CalendarDays },
  { href: "/workshop/", label: "Workshop", icon: Factory },
  { href: "/finance/", label: "Finance", icon: Banknote },
  { href: "/reports/", label: "Reports", icon: ChartColumn },
];
const DOCK = ["/", "/pipeline/", "/customers/", "/workshop/"].map((h) => NAV.find((n) => n.href === h)!);
const MORE = NAV.filter((n) => !DOCK.includes(n));
const norm = (p: string) => (p === "/" ? "/" : p.replace(/\/?$/, "/"));

/* Active pill: the leading edge leaves first, the trailing edge catches up. */
function PillNav({ path, go }: { path: string; go: (e: MouseEvent, href: string) => void }) {
  const box = useRef<HTMLElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const cur = useRef<{ l: number; r: number } | null>(null);
  const place = useCallback((animate: boolean) => {
    const b = box.current, p = ind.current;
    const a = b?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (!b || !p || !a) return;
    const W = b.clientWidth;
    const to = { l: a.offsetLeft, r: W - a.offsetLeft - a.offsetWidth };
    const paint = () => {
      p.style.clipPath = `inset(4px ${cur.current!.r}px 4px ${cur.current!.l}px round 999px)`;
    };
    if (!cur.current || !animate || reduced()) {
      cur.current = to;
      paint();
      return;
    }
    const right = to.l > cur.current.l;
    gsap.killTweensOf(cur.current);
    gsap.to(cur.current, { l: to.l, duration: right ? 0.72 : 0.42, ease: "power3.out", onUpdate: paint });
    gsap.to(cur.current, { r: to.r, duration: right ? 0.42 : 0.72, ease: "power3.out", onUpdate: paint });
  }, []);
  useIso(() => place(true), [path]);
  useEffect(() => {
    const f = () => place(false);
    window.addEventListener("resize", f);
    document.fonts?.ready.then(f);
    return () => window.removeEventListener("resize", f);
  }, [place]);
  return (
    <nav className="pillnav" ref={box} aria-label="Main">
      <span className="ind" ref={ind} aria-hidden="true" />
      {NAV.map((n) => (
        <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} onClick={(e) => go(e, n.href)}>{n.label}</Link>
      ))}
    </nav>
  );
}

function usePop() {
  const [on, set] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!on) return;
    const f = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) set(false);
    };
    const k = (e: KeyboardEvent) => e.key === "Escape" && set(false);
    document.addEventListener("pointerdown", f);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("pointerdown", f);
      document.removeEventListener("keydown", k);
    };
  }, [on]);
  return { on, set, ref };
}

const CH = { Website: Globe, WhatsApp: MessageCircle, Phone: Phone, Email: Mail };

function InboxPop() {
  const { s, addDeal, dispatch, toast } = useStore();
  const { on, set, ref } = usePop();
  const list = s.inbox.filter((m) => !m.done);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="iconbtn" aria-label={`Inbox, ${list.length} waiting`} aria-expanded={on} onClick={() => set(!on)}>
        <Inbox size={17} />{list.length > 0 && <span className="dot" />}
      </button>
      {on && (
        <div className="pop" role="dialog" aria-label="Inbox">
          <h2 style={{ fontSize: 15, fontWeight: 600, padding: "2px 4px 10px" }}>New enquiries</h2>
          {list.length === 0 && <Empty>Inbox is clear.</Empty>}
          <div style={{ display: "grid", gap: 8 }}>
            {list.map((m) => {
              const I = CH[m.channel];
              return (
                <div key={m.id} style={{ background: "var(--well)", borderRadius: 14, padding: 12 }}>
                  <div className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <I size={14} /><b style={{ fontWeight: 600 }}>{m.channel}</b><span className="muted" style={{ marginLeft: "auto" }}>{ago(m.at)}</span>
                  </div>
                  <p style={{ margin: "6px 0 2px" }}>{m.text}</p>
                  <p className="small muted">{m.from}</p>
                  <button className="btn sm gold" style={{ marginTop: 10 }} onClick={() => {
                    const id = addDeal({ title: m.title, customerId: m.customerId, value: m.estimate, service: m.service, pumpType: m.pumpType, urgency: m.urgency, source: m.channel === "Email" ? "Repeat" : m.channel, closesIn: m.urgency === "breakdown" ? 2 : 14 });
                    dispatch({ t: "inboxDone", id: m.id });
                    toast(`${id} added to Enquiry from ${m.channel}.`);
                  }}>Add to pipeline</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BellPop({ push }: { push: (h: string) => void }) {
  const { s, customer, setOpen } = useStore();
  const { on, set, ref } = usePop();
  const list = useMemo(() => {
    const t = today();
    const out: { k: string; icon: ReactNode; a: string; b: string; go: () => void }[] = [];
    s.deals.filter((d) => isOpen(d) && d.urgency === "breakdown").slice(0, 2).forEach((d) =>
      out.push({ k: d.id, icon: <Siren size={16} />, a: `Breakdown: ${d.title}`, b: `${customer(d.customerId)?.company}, ${stageOf(d.status)!.name}`, go: () => setOpen({ k: "deal", id: d.id }) }));
    s.jobs.filter((j) => j.done < 6 && daysBetween(t, j.due) <= 1).forEach((j) =>
      out.push({ k: j.id, icon: <Wrench size={16} />, a: `${j.id} due ${j.due === t ? "today" : "tomorrow"}`, b: `${j.title}, ${j.done} of 6 stages`, go: () => push("/workshop/#" + j.id) }));
    const waiting = s.replies.filter((m) => !m.done);
    if (waiting.length) out.push({ k: "rep", icon: <Reply size={16} />, a: `${waiting.length} outreach ${waiting.length === 1 ? "reply" : "replies"} waiting`, b: "Aim to answer within 5 minutes", go: () => push("/outreach/") });
    const od = s.invoices.filter((i) => i.status === "Overdue");
    if (od.length) out.push({ k: "od", icon: <Banknote size={16} />, a: `${od.length} invoices overdue`, b: `${zarK(od.reduce((a, i) => a + i.amount * VAT, 0))} incl. VAT`, go: () => push("/finance/") });
    const due = s.customers.flatMap((c) => c.pumps.map((p) => ({ c, p, n: nextRefurb(p) }))).filter((x) => daysBetween(t, x.n) <= 30);
    if (due.length) out.push({ k: "rf", icon: <RotateCcw size={16} />, a: `${due.length} pumps due for refurb within 30 days`, b: "From the customer pump registers", go: () => push("/customers/") });
    return out;
  }, [s, customer, setOpen, push]);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button className="iconbtn" aria-label={`Alerts, ${list.length}`} aria-expanded={on} onClick={() => set(!on)}><Bell size={17} />{list.length > 0 && <span className="dot" />}</button>
      {on && (
        <div className="pop" role="dialog" aria-label="Alerts">
          <h2 style={{ fontSize: 15, fontWeight: 600, padding: "2px 4px 8px" }}>Needs attention</h2>
          {list.map((x) => (
            <button key={x.k} onClick={() => { set(false); x.go(); }} style={{ display: "flex", gap: 12, width: "100%", textAlign: "left", padding: "10px 8px", borderRadius: 12 }} className="hov">
              <span className="muted" style={{ paddingTop: 2 }}>{x.icon}</span>
              <span>{x.a}<span className="small muted" style={{ display: "block" }}>{x.b}</span></span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const { s, ready, setOpen, open, reset } = useStore();
  const router = useRouter();
  const path = norm(usePathname());
  const main = useRef<HTMLElement>(null);
  const leaving = useRef(false);
  const [stuck, setStuck] = useState(false);
  const [night, setNight] = useState(false);
  const more = usePop();

  const push = useCallback((href: string) => {
    const same = norm(href.split("#")[0]) === norm(window.location.pathname);
    if (same) {
      if (href.includes("#")) window.location.hash = href.split("#")[1];
      else lenisTop();
      return;
    }
    if (leaving.current) return;
    if (reduced() || !main.current) {
      router.push(href);
      return;
    }
    leaving.current = true;
    gsap.to(main.current, {
      opacity: 0, y: -10, duration: 0.2, ease: "power3.out",
      onComplete: () => {
        leaving.current = false;
        router.push(href);
      },
    });
  }, [router]);

  const go = useCallback((e: MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    more.set(false);
    push(href);
  }, [push, more]);

  useIso(() => {
    if (main.current) gsap.set(main.current, { clearProps: "opacity,transform" });
    lenisTop();
  }, [path]);

  useEffect(() => {
    if (reduced()) return;
    const l = new Lenis({ lerp: 0.1 });
    setLenis(l);
    const raf = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(raf);
      l.destroy();
      setLenis(null);
    };
  }, []);

  useEffect(() => {
    const f = () => setStuck(window.scrollY > 12);
    f();
    window.addEventListener("scroll", f, { passive: true });
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen({ k: "search" });
      }
    };
    window.addEventListener("keydown", k);
    return () => {
      window.removeEventListener("scroll", f);
      window.removeEventListener("keydown", k);
    };
  }, [setOpen]);

  useEffect(() => {
    try {
      setNight(localStorage.getItem("fedpump-shift") === "night");
    } catch {}
  }, []);
  useEffect(() => {
    document.documentElement.dataset.shift = night ? "night" : "day";
    try {
      localStorage.setItem("fedpump-shift", night ? "night" : "day");
    } catch {}
  }, [night]);

  const exportAll = () =>
    downloadCsv(`fedpump-pipeline-${today()}.csv`, [
      ["Ref", "Title", "Customer", "Stage", "Value excl VAT", "Closes"],
      ...s.deals.filter(isOpen).map((d) => [d.id, d.title, s.customers.find((c) => c.id === d.customerId)?.company ?? "", stageOf(d.status)!.name, d.value, fmtDay(d.closes)]),
    ]);

  const tools = [
    { l: "Search", k: "Ctrl K", i: Search, f: () => setOpen({ k: "search" }) },
    { l: "New enquiry", i: Plus, f: () => setOpen({ k: "newDeal" }) },
    { l: "Log a call", i: Phone, f: () => setOpen({ k: "call" }) },
    { l: "Book a slot", i: CalendarDays, f: () => setOpen({ k: "newEvent" }) },
    { l: "WhatsApp a customer", i: MessageCircle, f: () => { const c = s.customers[0]; if (c) setOpen({ k: "message", customerId: c.id, channel: "WhatsApp", text: `Good day ${c.contact.split(" ")[0]}, ` }); } },
    { l: "New campaign", i: Send, f: () => setOpen({ k: "newCampaign" }) },
    { l: "Export pipeline", i: Upload, f: exportAll },
  ];
  const tail = [
    { l: "Reset demo data", i: RotateCcw, f: reset },
    { l: night ? "Day shift" : "Night shift", i: night ? Sun : Moon, f: () => setNight((n) => !n) },
  ];

  return (
    <>
      <div className="backdrop" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/backdrop.webp" alt="" width={1200} height={900} />
        <div className="night" />
      </div>
      <div className="grain" aria-hidden="true" />
      <div inert={open ? true : undefined}>
        <aside className="rail" aria-label="Tools">
          {tools.map((t) => (
            <button key={t.l} onClick={t.f} aria-label={t.l}><t.i size={17} /><span className="tip">{t.l}{t.k ? `  ${t.k}` : ""}</span></button>
          ))}
          <span className="sep" />
          {tail.map((t) => (
            <button key={t.l} onClick={t.f} aria-label={t.l}><t.i size={17} /><span className="tip">{t.l}</span></button>
          ))}
        </aside>
        <div className="shell">
          <div className={"topbar" + (stuck ? " stuck" : "")}>
            <div className="brand">
              <Link href="/" onClick={(e) => go(e, "/")} aria-label="Fedpump, go to overview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/brand/fedpump-logo.png" alt="Fedpump" width={222} height={157} />
              </Link>
              <span className="demo-chip">Demo data</span>
            </div>
            <PillNav path={path} go={go} />
            <div style={{ display: "flex", gap: 9, justifyContent: "flex-end", alignItems: "center" }}>
              <InboxPop />
              <BellPop push={push} />
              <span title={`${ME.name}, ${ME.role}`}><Avatar id={ME.id} size={38} /></span>
            </div>
          </div>
          <main ref={main} key={path} style={{ minHeight: "70vh" }}>{ready ? children : <p className="sr">Loading</p>}</main>
        </div>
        <nav className="dock" aria-label="Main, mobile" ref={more.ref as never}>
          {DOCK.map((n) => (
            <Link key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined} onClick={(e) => go(e, n.href)}><n.icon size={19} />{n.label}</Link>
          ))}
          <a href="#more" role="button" aria-expanded={more.on} onClick={(e) => { e.preventDefault(); more.set(!more.on); }} aria-current={MORE.some((n) => n.href === path) ? "page" : undefined}><Menu size={19} />More</a>
          {more.on && (
            <div className="pop" style={{ bottom: "calc(100% + 10px)", top: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {MORE.map((n) => (
                  <Link key={n.href} href={n.href} className="btn" style={{ flexDirection: "row", fontSize: 13.5 }} onClick={(e) => go(e, n.href)}><n.icon size={16} />{n.label}</Link>
                ))}
                {[tools[0], tools[1], tools[2], ...tail].map((t) => (
                  <button key={t.l} className="btn" onClick={() => { more.set(false); t.f(); }}><t.i size={16} />{t.l}</button>
                ))}
              </div>
            </div>
          )}
        </nav>
      </div>
      <Overlays />
    </>
  );
}
