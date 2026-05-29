import { AlertTriangle, Clock, FileText, Wrench, Package, Pencil } from "lucide-react";
import type { BadgeConfig } from "@/lib/urgentie";

const ICONS = {
  alert: AlertTriangle,
  clock: Clock,
  document: FileText,
  wrench: Wrench,
  package: Package,
  edit: Pencil,
} as const;

export function Badge({ config, size = 16 }: { config: BadgeConfig; size?: number }) {
  const Icon = ICONS[config.icon];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold ${config.bg} ${config.ink}`}
    >
      <Icon size={size} strokeWidth={2.5} aria-hidden="true" />
      {config.label}
    </span>
  );
}
