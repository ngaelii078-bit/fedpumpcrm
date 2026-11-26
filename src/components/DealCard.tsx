"use client";
import { PointerEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Ellipsis, MessageCircle, PanelRight, Siren, X } from "lucide-react";
import { STAGES, probOf, stageOf } from "@/lib/data";
import { fmtDay, zar } from "@/lib/format";
import { useStore } from "@/lib/store";
import type { Deal } from "@/lib/types";
import { Avatars } from "./ui/bits";

export function DealMenu({ deal, at, onClose }: { deal: Deal; at: { x: number; y: number }; onClose: () => void }) {
  const { moveDeal, setOpen } = useStore();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const back = document.activeElement as HTMLElement | null;
    ref.current?.querySelector("button")?.focus();
    const down = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        back?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const b = [...(ref.current?.querySelectorAll("button") ?? [])];
        const i = b.indexOf(document.activeElement as HTMLButtonElement);
        b[(i + (e.key === "ArrowDown" ? 1 : -1) + b.length) % b.length]?.focus();
      }
    };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    window.addEventListener("scroll", onClose, true);
    return () => {
      document.removeEventListener("pointerdown", down, true);
      document.removeEventListener("keydown", key, true);
      window.removeEventListener("scroll", onClose, true);
    };
  }, [onClose]);
  const run = (fn: () => void) => () => {
    onClose();
    fn();
  };
  const y = Math.min(at.y, window.innerHeight - 330);
  const x = Math.max(10, Math.min(at.x - 200, window.innerWidth - 214));
  return createPortal(
    <div className="menu" ref={ref} role="menu" style={{ left: x, top: y }}>
      <button role="menuitem" onClick={run(() => setOpen({ k: "deal", id: deal.id }))}><PanelRight size={15} /> Open</button>
      <button role="menuitem" onClick={run(() => setOpen({ k: "message", customerId: deal.customerId, channel: "WhatsApp", text: `Good day, following up on ${deal.id}, ${deal.title}. Is there anything you still need from us?` }))}>
        <MessageCircle size={15} /> WhatsApp customer
      </button>
      <hr />
      {STAGES.filter((s) => s.id !== deal.status).map((s) => (
        <button key={s.id} role="menuitem" onClick={run(() => moveDeal(deal.id, s.id))}>
          <span className="sw" style={{ background: s.dot }} /> Move to {s.name}
        </button>
      ))}
      <hr />
      <button role="menuitem" onClick={run(() => moveDeal(deal.id, "won"))}><Check size={15} /> Mark as won</button>
      <button role="menuitem" onClick={run(() => moveDeal(deal.id, "lost"))}><X size={15} /> Mark as lost</button>
    </div>,
    document.body,
  );
}

export function DealCard({ deal, tone, showStage, className = "", onPointerDown }: {
  deal: Deal; tone?: boolean; showStage?: boolean; className?: string; onPointerDown?: (e: PointerEvent<HTMLDivElement>) => void;
}) {
  const { customer, setOpen } = useStore();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const c = customer(deal.customerId);
  return (
    <>
      <div
        className={"deal " + className}
        data-deal={deal.id}
        data-tone={tone ? deal.status : undefined}
        role="button"
        tabIndex={0}
        aria-label={`${deal.title}, ${c?.company}, ${zar(deal.value)}`}
        onPointerDown={onPointerDown}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest(".dots") && !(e.currentTarget as HTMLElement).dataset.moved) setOpen({ k: "deal", id: deal.id });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.target === e.currentTarget) {
            e.preventDefault();
            setOpen({ k: "deal", id: deal.id });
          }
        }}
      >
        <div className="top">
          {deal.urgency === "breakdown" ? (
            <span className="urgent"><Siren size={14} /> Urgent, {fmtDay(deal.closes)}</span>
          ) : (
            <span>Closes {fmtDay(deal.closes)}</span>
          )}
          <button className="dots" type="button" aria-label={`Actions for ${deal.title}`} aria-haspopup="menu"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              const b = e.currentTarget.getBoundingClientRect();
              setMenu({ x: b.right, y: b.bottom + 6 });
            }}>
            <Ellipsis size={15} />
          </button>
        </div>
        <span className="tt">{deal.title}</span>
        <span className="co">{c?.company}</span>
        <div className="ft">
          <div>
            <div className="v">{zar(deal.value)}</div>
            {showStage && <div className="st">{stageOf(deal.status)?.name}, {Math.round(probOf(deal.status) * 100)}%</div>}
          </div>
          <Avatars ids={deal.owners} />
        </div>
      </div>
      {menu && <DealMenu deal={deal} at={menu} onClose={() => setMenu(null)} />}
    </>
  );
}
