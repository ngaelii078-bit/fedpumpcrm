"use client";
import { useMemo, useState } from "react";
import { Banknote, BellRing, Check, CircleAlert, Clock3, Download, FileText, Search } from "lucide-react";
import { addDays, daysBetween, downloadCsv, fmtDay, iso, mondayOf, parse, today, zar, zarAxis, zarK } from "@/lib/format";
import { VAT, inMonth, useStore } from "@/lib/store";
import type { InvoiceStatus } from "@/lib/types";
import { Count, Empty, PageHead, Panel, useEnter } from "@/components/ui/bits";
import { Cols } from "@/components/charts/charts";

const ST: Record<InvoiceStatus, { c: string; icon: typeof Check }> = {
  Draft: { c: "rgba(243,240,233,.76)", icon: FileText },
  Sent: { c: "#A9CDEF", icon: Clock3 },
  Overdue: { c: "var(--bad)", icon: CircleAlert },
  Paid: { c: "var(--good)", icon: Check },
};

export default function Finance() {
  const { s, dispatch, toast, customer, setOpen } = useStore();
  const root = useEnter();
  const [f, setF] = useState<InvoiceStatus | "Open" | "All">("Open");
  const [q, setQ] = useState("");
  const t = today();
  const inc = (n: number) => n * VAT;

  const owing = s.invoices.filter((i) => i.status === "Sent" || i.status === "Overdue");
  const overdue = s.invoices.filter((i) => i.status === "Overdue");
  const paidMonth = s.invoices.filter((i) => i.status === "Paid" && inMonth(i.paidAt, new Date()));
  const drafts = s.invoices.filter((i) => i.status === "Draft");
  const total = (xs: typeof owing) => xs.reduce((a, i) => a + inc(i.amount), 0);

  const age = useMemo(() => {
    const b = [0, 0, 0, 0];
    owing.forEach((i) => {
      const d = daysBetween(i.due, t);
      b[d <= 0 ? 0 : d <= 15 ? 1 : d <= 30 ? 2 : 3] += inc(i.amount);
    });
    return ["Not due", "1 to 15 d", "16 to 30 d", "Over 30 d"].map((label, i) => ({ label, value: b[i] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.invoices, t]);

  const weeks = useMemo(() => {
    const m = mondayOf(new Date());
    /* drafts fall due 30 days after the job is handed over */
    const exp = [
      ...owing.map((i) => ({ due: i.due, v: inc(i.amount) })),
      ...drafts.map((i) => ({ due: iso(addDays(parse(s.jobs.find((j) => j.dealId === i.dealId)?.due ?? i.date), 30)), v: inc(i.amount) })),
    ];
    return Array.from({ length: 6 }, (_, w) => {
      const a = iso(addDays(m, w * 7)), b = iso(addDays(m, w * 7 + 6));
      return { label: w === 0 ? "This wk" : fmtDay(a), value: exp.filter((i) => i.due >= a && i.due <= b).reduce((x, i) => x + i.v, 0) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.invoices]);

  const rows = s.invoices
    .filter((i) => (f === "All" ? true : f === "Open" ? i.status === "Sent" || i.status === "Overdue" : i.status === f))
    .filter((i) => {
      const x = q.trim().toLowerCase();
      return !x || `${i.id} ${i.title} ${customer(i.customerId)?.company}`.toLowerCase().includes(x);
    })
    .sort((a, b) => (f === "Open" ? a.due.localeCompare(b.due) : b.id.localeCompare(a.id)));

  const csv = () => downloadCsv(`fedpump-invoices-${t}.csv`, [
    ["Invoice", "Customer", "Work", "Date", "Due", "Status", "Excl VAT", "Incl VAT"],
    ...rows.map((i) => [i.id, customer(i.customerId)?.company, i.title, i.date, i.due, i.status, i.amount, Math.round(inc(i.amount))]),
  ]);

  return (
    <div ref={root}>
      <PageHead
        a="Cash and"
        b="invoices"
        kpis={[
          { icon: <Banknote size={18} />, value: total(paidMonth), format: zar, label: "Paid this month, incl. VAT" },
          { icon: <Clock3 size={18} />, value: total(owing), format: zar, label: "Owed to Fedpump, incl. VAT" },
          { icon: <CircleAlert size={18} />, value: total(overdue), format: zar, label: "Overdue", chip: overdue.length ? <span className="chip orange">{overdue.length} invoices</span> : undefined },
        ]}
        right={<button className="btn gold" onClick={csv}><Download size={16} /> Export CSV</button>}
      />
      <div className="fin">
        <Panel title="Debtors age" sub="incl. VAT">
          <div className="big" style={{ marginBottom: 4 }}><Count value={total(owing)} format={zar} /></div>
          <p className="small muted" style={{ marginBottom: 8 }}>across {owing.length} open invoices, 30 day terms</p>
          <Cols name="Debtors by age" data={age} color="var(--c2)" colors={["#4A90D9", "#BF8632", "#CE7236", "#E0603A"]} format={zarK} axis={zarAxis} height={292} />
        </Panel>
        <Panel title="Cash expected" sub="by due date">
          <div className="big" style={{ marginBottom: 4 }}><Count value={weeks.reduce((a, w) => a + w.value, 0)} format={zar} /></div>
          <p className="small muted" style={{ marginBottom: 8 }}>open invoices and jobs on the floor, next 6 weeks</p>
          <Cols name="Cash expected per week" data={weeks} color="#D9A050" format={zarK} axis={zarAxis} height={292} />
        </Panel>
        <Panel title="Ready to invoice" sub="jobs on the floor">
          <div className="big" style={{ marginBottom: 4 }}><Count value={total(drafts)} format={zar} /></div>
          <p className="small muted" style={{ marginBottom: 10 }}>{drafts.length} drafts. Each one sends when the job is handed over.</p>
          <ul style={{ display: "grid", gap: 2 }}>
            {drafts.slice(0, 5).map((i) => {
              const j = s.jobs.find((x) => x.dealId === i.dealId);
              return (
                <li key={i.id}>
                  <button className="rowlink" onClick={() => setOpen({ k: "deal", id: i.dealId })}>
                    <span style={{ flex: 1, minWidth: 0 }}><span className="clip">{customer(i.customerId)?.company}</span><span className="small muted">{j ? `${j.id}, ${j.done} of 6 bolts` : i.id}</span></span>
                    <b className="tnum" style={{ fontWeight: 600 }}>{zarK(inc(i.amount))}</b>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel className="wide" title="Invoices">
          <div className="toolbar">
            <label className="field wide" style={{ width: 250 }}><Search size={16} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Invoice or customer" aria-label="Search invoices" /></label>
            {(["Open", "Overdue", "Draft", "Paid", "All"] as const).map((x) => <button key={x} className="tag" aria-pressed={f === x} onClick={() => setF(x)}>{x}</button>)}
          </div>
          <div className="scrollx" style={{ maxHeight: 460, overflowY: "auto" }} data-lenis-prevent>
            <table className="tbl" style={{ minWidth: 800 }}>
              <thead><tr><th>Invoice</th><th>Customer</th><th>Work</th><th>Due</th><th>Status</th><th className="r">Incl. VAT</th><th /></tr></thead>
              <tbody>
                {rows.map((i) => {
                  const I = ST[i.status].icon;
                  const late = daysBetween(i.due, t);
                  return (
                    <tr key={i.id}>
                      <td className="mono">{i.id}</td>
                      <td><button onClick={() => setOpen({ k: "customer", id: i.customerId })} style={{ fontWeight: 500, textAlign: "left" }}>{customer(i.customerId)?.company}</button></td>
                      <td className="muted">{i.title}</td>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{i.status === "Draft" ? "On handover" : fmtDay(i.due)}</td>
                      <td><span className="cond" style={{ color: ST[i.status].c }}><I size={14} />{i.status}{i.status === "Overdue" ? ` ${late} d` : ""}</span></td>
                      <td className="r">{zar(inc(i.amount))}</td>
                      <td className="r">
                        <span style={{ display: "inline-flex", gap: 8 }}>
                          {i.status === "Overdue" && (
                            <button className="btn sm" disabled={i.reminded} onClick={() => { dispatch({ t: "remind", id: i.id }); toast(`Reminder logged for ${i.id}. Demo only, nothing was sent.`); }}><BellRing size={14} />{i.reminded ? "Reminded" : "Remind"}</button>
                          )}
                          {(i.status === "Overdue" || i.status === "Sent") && <button className="btn sm" onClick={() => { dispatch({ t: "pay", id: i.id }); toast(`${i.id} marked as paid.`); }}>Mark paid</button>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && <Empty>No invoices match.</Empty>}
          </div>
        </Panel>
      </div>
    </div>
  );
}
