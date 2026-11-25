"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, CalendarClock, Check, CircleSlash, Clock3, FastForward, FileText, Lock, Mail, Pause, Play, Plus, Reply, Send } from "lucide-react";
import { AUDIENCES, DAILY_CAP, DOMAINS, FIELDS, READY, REPLY_LABEL, contactOf, mergeText, mergeVars, presend, score } from "@/lib/outreach";
import { addDays, ago, fmtDay, int, iso, mondayOf, pct, today, zar, zarK } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Campaign, MailReply, Recipient, ReplyKind } from "@/lib/types";
import { Empty, Initials, PageHead, Panel, useEnter } from "@/components/ui/bits";
import { Cols } from "@/components/charts/charts";
import { Paper, Pipe, Presend } from "./OutreachBits";

const KIND_CHIP: Record<ReplyKind, string> = { quote: "gold", yes: "green", later: "ghost", stop: "orange" };
const STATUS_CHIP: Record<Campaign["status"], string> = { Running: "green", Paused: "gold", Draft: "ghost", Finished: "blue" };

function ReplyCard({ m }: { m: MailReply }) {
  const { s, setOpen, dispatch, toast, convertReply } = useStore();
  const k = contactOf(s, m.contactId);
  if (!k) return null;
  const camp = s.campaigns.find((c) => c.id === m.campaignId);
  const hot = m.kind === "quote" || m.kind === "yes";
  const late = hot && Date.now() - m.at > 5 * 60000;
  const r: Recipient = { id: k.id, sent: 1, state: "replied" };
  const answer = () =>
    setOpen({ k: "message", customerId: k.id, channel: "Email", text: mergeText(READY[m.kind], mergeVars(s, r)), done: () => dispatch({ t: "replyDone", id: m.id }) });
  return (
    <li className="reply">
      <div style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
        <Initials name={k.name} segment={k.segment} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="clip" style={{ fontWeight: 600 }}>{k.name}</div>
          <div className="small muted clip">{k.company}{k.kind === "prospect" ? ", prospect" : ""}</div>
        </div>
        <span className={"chip " + KIND_CHIP[m.kind]}>{REPLY_LABEL[m.kind]}</span>
      </div>
      <p style={{ margin: "9px 0 8px" }}>{m.text}</p>
      <div className="small muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <Clock3 size={13} />{ago(m.at)}{late && <span style={{ color: "#ffb59f", fontWeight: 600 }}>past the 5 minute mark</span>}
        <span className="clip" style={{ marginLeft: "auto", maxWidth: 150 }}>{camp?.name}</span>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
        {hot && <button className="btn sm gold" onClick={() => convertReply(m.id)}><Plus size={14} /> Add to pipeline</button>}
        {m.kind === "stop" ? (
          <button className="btn sm gold" onClick={() => { dispatch({ t: "optOut", id: k.id, on: true }); toast(`${k.company} is off the list for good.`); }}><Ban size={14} /> Take off list</button>
        ) : (
          <button className="btn sm" onClick={answer}><Reply size={14} /> Answer</button>
        )}
        {m.kind === "later" && <button className="btn sm" onClick={() => dispatch({ t: "replyDone", id: m.id })}><Check size={14} /> Done</button>}
      </div>
    </li>
  );
}

const STATE: Record<Recipient["state"], { l: string; c: string; i: typeof Check }> = {
  active: { l: "Waiting", c: "var(--ink-2)", i: Clock3 },
  replied: { l: "Replied", c: "var(--good)", i: Reply },
  done: { l: "No reply", c: "var(--ink-3)", i: CircleSlash },
  out: { l: "Off the list", c: "var(--bad)", i: Ban },
};

export default function Outreach() {
  const { s, setOpen, dispatch, toast, playCampaign } = useStore();
  const root = useEnter();
  const [id, setId] = useState<string>(() => s.campaigns.find((c) => c.status === "Running")?.id ?? s.campaigns[0]?.id ?? "");
  const [si, setSi] = useState(0);
  const [, tick] = useState(0);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const f = () => {
      const h = window.location.hash.slice(1);
      if (h) {
        setId(h);
        setSi(0);
      }
    };
    f();
    window.addEventListener("hashchange", f);
    const t = setInterval(() => tick((n) => n + 1), 30000);
    return () => {
      window.removeEventListener("hashchange", f);
      clearInterval(t);
    };
  }, []);

  const all = score(s, s.campaigns);
  const c = s.campaigns.find((x) => x.id === id) ?? s.campaigns[0];
  const waiting = s.replies.filter((m) => !m.done).sort((a, b) => b.at - a.at);
  const sentToday = s.campaigns.flatMap((x) => x.recipients).filter((r) => r.lastSent === today()).length;

  const weeks = useMemo(() => {
    const m = mondayOf(new Date());
    const rs = s.campaigns.flatMap((x) => x.recipients).filter((r) => r.repliedOn);
    return Array.from({ length: 8 }, (_, i) => {
      const a = iso(addDays(m, (i - 7) * 7)), b = iso(addDays(m, (i - 7) * 7 + 6));
      return { label: i === 7 ? "This wk" : fmtDay(a), value: rs.filter((r) => r.repliedOn! >= a && r.repliedOn! <= b).length };
    });
  }, [s.campaigns]);

  const off = [
    ...s.customers.filter((x) => x.optOut).map((x) => ({ id: x.id, n: x.company, w: x.contact, d: x.outSince })),
    ...s.prospects.filter((x) => x.status === "out").map((x) => ({ id: x.id, n: x.company, w: x.contact, d: x.outSince })),
  ].sort((a, b) => (b.d ?? "").localeCompare(a.d ?? ""));

  const head = (
    <PageHead
      a="Email"
      b="outreach"
      kpis={[
        { icon: <Send size={18} />, value: all.reached, format: int, label: "People emailed" },
        { icon: <Reply size={18} />, value: all.reached ? (all.replies / all.reached) * 100 : 0, format: pct, label: "Replied", chip: <span className="chip blue">{all.replies} replies</span> },
        { icon: <FileText size={18} />, value: all.quotes, format: int, label: "Quotes from outreach", chip: <span className="chip gold">{zarK(all.quoteValue)}</span> },
      ]}
      right={<button className="btn gold" onClick={() => setOpen({ k: "newCampaign" })}><Plus size={16} /> New campaign</button>}
    />
  );
  if (!c) return <div ref={root}>{head}<div className="panel"><Empty>No campaigns yet.</Empty></div></div>;

  const cold = AUDIENCES[c.audience].kind === "prospect";
  const step = c.steps[Math.min(si, c.steps.length - 1)];
  const i = Math.min(si, c.steps.length - 1);
  const sc = score(s, [c]);
  const edit = c.status === "Draft" || c.status === "Paused";
  const preview = c.recipients.filter((r) => r.state !== "out");
  const ready = c.steps.every((x, n) => presend(x, c.audience, n === 0).ok);
  const left = c.recipients.filter((r) => r.state === "active" && r.sent < c.steps.length).length;
  const insert = (f: string) => {
    const el = area.current;
    const at = el?.selectionStart ?? step.body.length;
    const tag = `{{${f}}}`;
    dispatch({ t: "step", id: c.id, i, patch: { body: step.body.slice(0, at) + tag + step.body.slice(el?.selectionEnd ?? at) } });
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + tag.length, at + tag.length);
    });
  };

  return (
    <div ref={root}>
      {head}
      <div className="outr">
        <div className="outl">
          <Panel title="Replies waiting" sub={waiting.length ? "answer within 5 minutes" : undefined} actions={waiting.length ? <span className="chip orange">{waiting.length}</span> : undefined}>
            {waiting.length === 0 && <Empty>Every reply is answered.</Empty>}
            <ul style={{ display: "grid", gap: 10 }}>{waiting.map((m) => <ReplyCard key={m.id} m={m} />)}</ul>
          </Panel>
          <Panel title="Campaigns" sub={`${s.campaigns.filter((x) => x.status === "Running").length} running`}>
            <div className="camps">
              {s.campaigns.map((x) => {
                const q = score(s, [x]);
                const total = x.recipients.length * x.steps.length || 1;
                const done = x.status === "Finished" ? 1 : q.sent / total;
                return (
                  <button key={x.id} className="camp" aria-pressed={x.id === c.id} onClick={() => { setId(x.id); setSi(0); }}>
                    <span style={{ display: "flex", gap: 8, alignItems: "center" }}><b className="clip" style={{ flex: 1, fontWeight: 600 }}>{x.name}</b><span className={"chip " + STATUS_CHIP[x.status]}>{x.status}</span></span>
                    <span className="small muted">{AUDIENCES[x.audience].name}, {q.contacts} people, {q.replies} {q.replies === 1 ? "reply" : "replies"}</span>
                    <span className="meter"><i style={{ width: `${Math.max(0, done) * 100}%` }} /></span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        <div className="panel" data-enter style={{ padding: 18 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
            <div style={{ flex: "1 1 260px", minWidth: 0 }}>
              <div className="small muted">{AUDIENCES[c.audience].name}{c.segment !== "All" ? `, ${c.segment.toLowerCase()}` : ""}{c.started ? `, started ${fmtDay(c.started)}` : ", not started"}</div>
              <h2 style={{ fontSize: 22, fontWeight: 600, lineHeight: 1.2, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>{c.name}<span className={"chip " + STATUS_CHIP[c.status]}>{c.status}</span></h2>
            </div>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
              {c.status === "Running" && (
                <>
                  <button className="btn" onClick={() => { dispatch({ t: "campaign", id: c.id, patch: { status: "Paused" } }); toast(`${c.name} paused.`); }}><Pause size={16} /> Pause</button>
                  <button className="btn gold" onClick={() => playCampaign(c.id)}><FastForward size={16} /> Demo: play a day</button>
                </>
              )}
              {c.status === "Paused" && <button className="btn gold" disabled={!ready} onClick={() => { dispatch({ t: "campaign", id: c.id, patch: { status: "Running" } }); toast(`${c.name} running again.`); }}><Play size={16} /> Resume</button>}
              {c.status === "Draft" && (
                <button className="btn gold" disabled={!ready || !c.recipients.length} onClick={() => { dispatch({ t: "startCampaign", id: c.id }); toast(`${c.name} started. ${c.recipients.length} emails logged, nothing was sent.`); }}><Send size={16} /> Start with {c.recipients.length}</button>
              )}
              {c.status === "Finished" && <button className="btn" onClick={() => setOpen({ k: "newCampaign", audience: c.audience, segment: c.segment === "All" ? undefined : c.segment })}><Plus size={16} /> New from this</button>}
            </div>
          </div>

          <Pipe key={c.id} stages={[
            { label: "Emailed", value: sc.reached },
            { label: "Replied", value: sc.replies },
            { label: "Quoted", value: sc.quotes },
            { label: "Ordered", value: sc.orders },
          ]} />
          <div className="small muted" style={{ display: "flex", gap: "4px 22px", flexWrap: "wrap", margin: "10px 0 18px" }}>
            <span><b>{sc.sent}</b> emails logged</span>
            <span><b>{zar(sc.quoteValue)}</b> quoted</span>
            <span><b>{zar(sc.orderValue)}</b> ordered</span>
            <span><b>{sc.out}</b> asked to stop</span>
            {c.status === "Running" && <span><b>{left}</b> still to get an email</span>}
          </div>

          <div className="seq" role="group" aria-label="Emails in this campaign">
            {c.steps.map((x, n) => {
              const reached = c.recipients.filter((r) => r.sent > n).length;
              return (
                <button key={n} aria-pressed={n === i} onClick={() => setSi(n)}>
                  <Mail size={16} /><span><b>Day {x.day}</b><span className="small muted">{reached} of {c.recipients.length} sent</span></span>
                </button>
              );
            })}
            {cold && <div className="locked"><Lock size={16} /><span><b>No follow up</b><span className="small muted">Opens only when they reply</span></span></div>}
          </div>

          <div className="mailgrid">
            <div style={{ display: "grid", gap: 12, alignContent: "start", minWidth: 0 }}>
              <label><span className="lab">Subject</span><input className="inp" value={step.subject} readOnly={!edit} onChange={(e) => dispatch({ t: "step", id: c.id, i, patch: { subject: e.target.value } })} /></label>
              <label><span className="lab">Email{!edit && <span className="dim"> {c.status === "Running" ? "(pause to edit)" : "(finished)"}</span>}</span>
                <textarea ref={area} className="inp" rows={11} value={step.body} readOnly={!edit} onChange={(e) => dispatch({ t: "step", id: c.id, i, patch: { body: e.target.value } })} data-lenis-prevent />
              </label>
              {edit && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {FIELDS[c.audience].map((f) => <button key={f} type="button" className="tag mono" style={{ height: 28, padding: "0 10px" }} onClick={() => insert(f)}>{f}</button>)}
                </div>
              )}
              <Presend step={step} audience={c.audience} first={i === 0} />
            </div>
            <div style={{ minWidth: 0 }}>
              <span className="lab">As they read it. Filled in parts are marked.</span>
              {preview.length ? <Paper key={c.id + i} step={step} list={preview} /> : <Empty>Nobody in this campaign.</Empty>}
            </div>
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "22px 0 4px" }}>People in this campaign</h3>
          <div className="scrollx" style={{ maxHeight: 380, overflowY: "auto" }} data-lenis-prevent>
            <table className="tbl" style={{ minWidth: 640 }}>
              <thead><tr><th>Person</th><th>About</th><th>Emails</th><th>Last sent</th><th>Status</th><th /></tr></thead>
              <tbody>
                {c.recipients.map((r) => {
                  const k = contactOf(s, r.id);
                  const st = STATE[r.state];
                  const d = r.dealId ? s.deals.find((x) => x.id === r.dealId) : undefined;
                  return (
                    <tr key={r.id}>
                      <td>
                        {k?.kind === "customer" ? <button style={{ fontWeight: 500, textAlign: "left" }} onClick={() => setOpen({ k: "customer", id: r.id })}>{k.name}</button> : <span style={{ fontWeight: 500 }}>{k?.name}</span>}
                        <span className="small muted" style={{ display: "block" }}>{k?.company}</span>
                      </td>
                      <td className="mono muted">{r.pump ?? r.quote ?? k?.town}</td>
                      <td className="tnum">{r.sent} of {c.steps.length}</td>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>{r.lastSent ? fmtDay(r.lastSent) : "Queued"}</td>
                      <td>
                        {d ? (
                          <button className="cond" style={{ color: d.status === "won" ? "var(--good)" : "var(--gold)" }} onClick={() => setOpen({ k: "deal", id: d.id })}><FileText size={14} />{d.status === "won" ? "Ordered" : "Quoted"} {zarK(d.value)}</button>
                        ) : (
                          <span className="cond" style={{ color: st.c }}><st.i size={14} />{r.reply ? REPLY_LABEL[r.reply] : r.sent === 0 && r.state === "active" ? "Queued" : st.l}</span>
                        )}
                      </td>
                      <td className="r">{r.state === "active" && c.status !== "Finished" && <button className="btn sm" onClick={() => dispatch({ t: "stopRecipient", id: c.id, who: r.id })}>Stop</button>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="out3">
        <Panel title="Replies per week"><Cols name="Replies per week" data={weeks} color="#4A90D9" format={int} height={190} /></Panel>
        <Panel title="Sending inboxes" sub={`${sentToday} of ${DAILY_CAP} today`}>
          <ul style={{ display: "grid", gap: 16, paddingTop: 4 }}>
            {DOMAINS.map((d) => (
              <li key={d.name}>
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}><span className="mono clip" style={{ flex: 1 }}>{d.name}</span><span className={"chip " + (d.cap ? "green" : "gold")}>{d.cap ? "Ready" : `Warming, day ${d.warm} of 14`}</span></div>
                <div className="meter" style={{ margin: "9px 0 7px" }}><i style={{ width: `${d.health}%` }} /></div>
                <div className="small muted">{d.boxes} inboxes, health {d.health}%, {d.cap ? `${d.cap} emails a day` : "not sending yet"}</div>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 14 }}>Plain text, no open tracking, never from the main domain.</p>
        </Panel>
        <Panel title="Do not contact" sub={`${off.length} on the list`}>
          {off.length === 0 && <Empty>Nobody has asked to stop.</Empty>}
          <ul style={{ display: "grid", gap: 4 }}>
            {off.slice(0, 5).map((x) => (
              <li key={x.id} className="rowlink" style={{ cursor: "default" }}>
                <Ban size={16} className="muted" />
                <span style={{ flex: 1, minWidth: 0 }}><span className="clip">{x.n}</span><span className="small muted clip">{x.w}</span></span>
                <span className="small muted">{x.d ? fmtDay(x.d) : ""}</span>
              </li>
            ))}
          </ul>
          <p className="small muted" style={{ marginTop: 10, display: "flex", gap: 8 }}><CalendarClock size={14} style={{ flex: "none", marginTop: 2 }} /> Left out of every list the same day they ask.</p>
        </Panel>
      </div>
    </div>
  );
}
