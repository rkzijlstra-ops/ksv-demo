export type Urgentie = "rood" | "geel" | null;
export type Bron = "pdf" | "monteur";
export type Documenttype =
  | "orderbevestiging"
  | "werkbon_service"
  | "tekst"
  | "onbekend"
  | null;

export interface BadgeConfig {
  label: string;
  bg: string;
  ink: string;
  icon: "alert" | "clock" | "document" | "wrench" | "package" | "edit";
}

/** Badge-config voor urgentie. null = geen badge tonen (PDF-klus zonder urgentie). */
export function urgentieConfig(urgentie: Urgentie): BadgeConfig | null {
  if (urgentie === "rood") {
    return { label: "DIRECT", bg: "bg-urgent-rood", ink: "text-white", icon: "alert" };
  }
  if (urgentie === "geel") {
    // gele achtergrond vereist donkere tekst voor leesbaar contrast
    return { label: "ACHTERAF", bg: "bg-urgent-geel", ink: "text-ink", icon: "clock" };
  }
  return null;
}

/** Badge-config voor bron (waar de regel vandaan komt). */
export function bronConfig(bron: Bron): BadgeConfig {
  if (bron === "pdf") {
    return { label: "Opdracht", bg: "bg-surface", ink: "text-ink-muted", icon: "document" };
  }
  return { label: "Melding", bg: "bg-surface", ink: "text-ink-muted", icon: "wrench" };
}

/** Badge-config voor documenttype (montage / service / handmatig). null = geen badge. */
export function documenttypeConfig(type: Documenttype): BadgeConfig | null {
  if (type === "orderbevestiging") {
    return { label: "Montage", bg: "bg-surface", ink: "text-ink-muted", icon: "package" };
  }
  if (type === "werkbon_service") {
    return { label: "Service", bg: "bg-surface", ink: "text-ink-muted", icon: "wrench" };
  }
  if (type === "tekst") {
    return { label: "Handmatig", bg: "bg-surface", ink: "text-ink-muted", icon: "edit" };
  }
  return null;
}
