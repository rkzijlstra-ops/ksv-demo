import { FileText, Map, Spline, PencilRuler, ClipboardList, Image as ImageIcon, File } from "lucide-react";
import type { SoortMeta } from "@/lib/document-weergave";

/** Mapt de iconKey uit document-weergave op het lucide-icoon (zie docs/ICONEN.md). */
const ICONEN = {
  orderbon: FileText,
  tekening: PencilRuler,
  bovenaanzicht: Map,
  leidingschema: Spline,
  offerte: FileText,
  werkbon: ClipboardList,
  afbeelding: ImageIcon,
  overig: File,
} as const;

export function DocumentIcoon({
  iconKey,
  size = 22,
  className,
}: {
  iconKey: SoortMeta["iconKey"];
  size?: number;
  className?: string;
}) {
  const Icoon = ICONEN[iconKey] ?? File;
  return <Icoon size={size} className={className} aria-hidden="true" />;
}
