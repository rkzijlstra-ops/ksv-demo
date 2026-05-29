import { AlertTriangle, Clock, FileText, Wrench, Package, Pencil, CheckCircle2 } from "lucide-react";
import type { BadgeConfig } from "@/lib/urgentie";

const ICONS = {
  alert: AlertTriangle,
  clock: Clock,
  document: FileText,
  wrench: Wrench,
  package: Package,
  edit: Pencil,
  check: CheckCircle2,
} as const;

export function Badge({ config, size = 14 }: { config: BadgeConfig; size?: number }) {
  const Icon = ICONS[config.icon];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border-[1.5px] px-2 py-0.5 text-xs font-extrabold uppercase tracking-[0.04em] ${config.bg} ${config.ink} ${config.border ?? "border-current"}`}
    >
      <Icon size={size} strokeWidth={2.5} aria-hidden="true" />
      {config.label}
    </span>
  );
}
