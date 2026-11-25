"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { Download, Mail, Phone, Plus, RotateCcw, Search, Star, Users } from "lucide-react";
import { SEGMENTS } from "@/lib/data";
import { daysBetween, downloadCsv, fmtDay, fmtSoon, int, relDay, today, zar, zarK } from "@/lib/format";
import { isOpen, nextRefurb, sum, useStore } from "@/lib/store";
import { Empty, Initials, PageHead, Seg, reduced, useEnter } from "@/components/ui/bits";

type Sort = "Refurb due" | "Last contacted" | "Open value";

export default function Customers() {
  const { s, dispatch, setOpen } = useStore();
  const root = useEnter();
  const grid = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [seg, setSeg] = useState<string>("All");
  const [star, setStar] = useState(false);
  const [sort, setSort] = useState<Sort>("Refurb due");
  const [view, setView] = useState<"Grid" | "Table">("Grid");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return s.customers
      .map((c) => {
        const open = sum(s.deals.filter((d) => d.customerId === c.id && isOpen(d)));
        const next = c.pumps.map((p) => ({ p, d: nextRefurb(p) })).sort((a, b) => a.d.localeCompare(b.d))[0];
        const left = next ? daysBetween(today(), next.d) : 999;
        const used = next ? Math.min(1, Math.max(0.04, daysBetween(next.p.lastRefurb, today()) / Math.max(1, daysBetween(next.p.lastRefurb, next.d)))) : 0;
        return { c, open, next, left, used };
      })
      .filter(({ c }) => (seg === "All" || c.segment === seg) && (!star || c.starred) && (!t || `${c.contact} ${c.company} ${c.town} ${c.pumps.map((p) => p.tag).join(" ")}`.toLowerCase().includes(t)))
      .sort((a, b) => (sort === "Refurb due" ? a.left - b.left : sort === "Open value" ? b.open - a.open : b.c.lastContact.localeCompare(a.c.lastContact)));
  }, [s.customers, s.deals, q, seg, star, sort]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduced() || !grid.current) return;
    gsap.fromTo(grid.current.children, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: "power3.out", stagger: 0.025, clearProps: "transform,opacity" });
  }, [seg, star, sort, view]);

  const week = s.customers.filter((c) => daysBetween(c.lastContact, today()) <= 7).length;
  const dueSoon = s.customers.flatMap((c) => c.pumps).filter((p) => daysBetween(today(), nextRefurb(p)) <= 30).length;
  const pumps = s.customers.reduce((a, c) => a + c.pumps.length, 0);

  const csv = () => downloadCsv(`fedpump-customers-${today()}.csv`, [
    ["Company", "Contact", "Role", "Industry", "Town", "Phone", "Email", "Open value", "Next refurb"],
    ...rows.map(({ c, open, next }) => [c.company, c.contact, c.role, c.segment, c.town, c.phone, c.email, open, next ? `${next.p.tag} ${fmtDay(next.d)}` : ""]),
  ]);

  return (
    <div ref={root}>
      <PageHead
        a="Customer"
        b="directory"
        kpis={[
          { icon: <Users size={18} />, value: s.customers.length, format: int, label: `Customers, ${pumps} pumps on record` },
          { icon: <Phone size={18} />, value: week, format: int, label: "Contacted in the last 7 days" },
          { icon: <RotateCcw size={18} />, value: dueSoon, format: int, label: "Pumps due for refurb in 30 days", chip: dueSoon ? <span className="chip orange">Call first</span> : undefined },
        ]}
      />
      <div className="toolbar" data-enter>
        <label className="field wide" style={{ width: 270 }}><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company or pump tag" aria-label="Search customers" /></label>
        {["All", ...SEGMENTS].map((x) => <button key={x} className="tag" aria-pressed={seg === x} onClick={() => setSeg(x)}>{x}</button>)}
        <button className="tag" aria-pressed={star} onClick={() => setStar(!star)}><Star size={14} fill={star ? "currentColor" : "none"} /> Starred</button>
        <span className="grow" />
        <label className="field" style={{ paddingRight: 8 }}><span className="sr">Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ background: "none", color: "var(--ink)", outline: "none" }}>
            {(["Refurb due", "Last contacted", "Open value"] as Sort[]).map((x) => <option key={x} style={{ background: "#1a232c" }}>{x}</option>)}
          </select>
        </label>
        <Seg label="View" value={view} options={["Grid", "Table"] as const} onChange={setView} />
        <button className="iconbtn" aria-label="Export CSV" onClick={csv}><Download size={17} /></button>
        <button className="btn gold" onClick={() => setOpen({ k: "newCustomer" })}><Plus size={16} /> New customer</button>
      </div>

      {rows.length === 0 && <div className="panel"><Empty>No customers match. Clear a filter or add one.</Empty></div>}
      {view === "Grid" ? (
        <div ref={grid} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 285px), 1fr))", gap: 14 }}>
          {rows.map(({ c, open, next, left, used }) => (
            <article key={c.id} className="ccard" data-enter role="button" tabIndex={0} aria-label={`${c.contact}, ${c.company}`}
              onClick={() => setOpen({ k: "customer", id: c.id })}
              onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) { e.preventDefault(); setOpen({ k: "customer", id: c.id }); } }}>
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <Initials name={c.contact} segment={c.segment} />
                <button className={"iconbtn sm " + (c.starred ? "on" : "")} style={{ marginLeft: "auto" }} aria-pressed={c.starred} aria-label={`Star ${c.company}`} onClick={(e) => { e.stopPropagation(); dispatch({ t: "star", id: c.id }); }}><Star size={14} fill={c.starred ? "currentColor" : "none"} /></button>
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: 16.5, fontWeight: 600 }}>{c.company}</h2>
                <p className="small muted">{c.contact}, {c.role}</p>
              </div>
              <div className="box">
                <div><div className="small dim">Open quotes</div><b className="display" style={{ fontWeight: 600 }}>{open ? zar(open) : "None"}</b></div>
                <div><div className="small dim">Last contact</div><b className="display" style={{ fontWeight: 600 }}>{relDay(c.lastContact)}</b></div>
              </div>
              <div>
                <div className="small" style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
                  <span className="mono muted">{next ? next.p.tag : "No pumps yet"}</span>
                  {next && <span className={left < 0 ? "" : "muted"} style={left < 0 ? { color: "var(--bad)", fontWeight: 600 } : undefined}>{left < 0 ? "Refurb overdue" : `Refurb ${fmtSoon(next.d)}`}</span>}
                </div>
                <div className={"meter" + (left < 30 ? " hot" : "")}><i style={{ width: `${used * 100}%` }} /></div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="small muted" style={{ marginRight: "auto" }}>{c.segment}, {c.town}</span>
                <button className="iconbtn sm" aria-label={`Email ${c.contact}`} onClick={(e) => { e.stopPropagation(); setOpen({ k: "message", customerId: c.id, channel: "Email", text: `Good day ${c.contact.split(" ")[0]},\n\n` }); }}><Mail size={14} /></button>
                <button className="iconbtn sm" aria-label={`Log a call with ${c.contact}`} onClick={(e) => { e.stopPropagation(); setOpen({ k: "call", customerId: c.id }); }}><Phone size={14} /></button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="panel scrollx" style={{ padding: 6 }} ref={grid}>
          <table className="tbl" style={{ minWidth: 860 }}>
            <thead><tr><th>Company</th><th>Contact</th><th>Industry</th><th>Town</th><th>Last contact</th><th>Next refurb</th><th className="r">Open quotes</th></tr></thead>
            <tbody>
              {rows.map(({ c, open, next, left }) => (
                <tr key={c.id} data-click onClick={() => setOpen({ k: "customer", id: c.id })}>
                  <td><button style={{ fontWeight: 600 }} onClick={(e) => { e.stopPropagation(); setOpen({ k: "customer", id: c.id }); }}>{c.company}</button></td>
                  <td>{c.contact}<span className="small muted" style={{ display: "block" }}>{c.role}</span></td>
                  <td className="muted">{c.segment}</td><td className="muted">{c.town}</td><td className="muted">{relDay(c.lastContact)}</td>
                  <td>{next ? <><span className="mono">{next.p.tag}</span><span className="small" style={{ display: "block", color: left < 0 ? "var(--bad)" : "var(--ink-2)" }}>{left < 0 ? "Overdue" : fmtSoon(next.d)}</span></> : "None"}</td>
                  <td className="r">{open ? zarK(open) : "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
