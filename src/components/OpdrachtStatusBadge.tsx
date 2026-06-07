import { Inbox, Pencil, Send, CheckCircle2, PackageCheck, Ban, type LucideIcon } from "lucide-react";
import type { DashboardStatus } from "@/lib/db";

/**
 * Statusbadge voor de opdrachtgeverskant: altijd kleur + icoon + label (nooit kleur alleen).
 * Literal Tailwind-classes per status zodat de JIT ze oppakt. Kleuren = bestaande tokens
 * (alleen bevestigd-blauw is nieuw), conform DESIGN-COMPLEET-SYSTEEM en design-system.md.
 */
const CONFIG: Record<DashboardStatus, { label: string; classes: string; Icon: LucideIcon }> = {
  binnen: { label: "Binnen", classes: "bg-white text-ink-muted border-line", Icon: Inbox },
  concept_gepland: {
    label: "Nog te versturen",
    classes: "bg-white text-accent border-accent border-dashed",
    Icon: Pencil,
  },
  gepland: { label: "Gepland", classes: "bg-urgent-geel text-ink border-urgent-geel", Icon: Send },
  bevestigd: {
    label: "Bevestigd",
    classes: "bg-bevestigd text-white border-bevestigd",
    Icon: CheckCircle2,
  },
  opgeleverd: {
    label: "Opgeleverd",
    classes: "bg-success text-white border-success",
    Icon: PackageCheck,
  },
  geannuleerd: { label: "Geannuleerd", classes: "bg-white text-ink-muted border-line", Icon: Ban },
};

export function OpdrachtStatusBadge({ status }: { status: DashboardStatus }) {
  const { label, classes, Icon } = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-[1.5px] px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] ${classes}`}
    >
      <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}
