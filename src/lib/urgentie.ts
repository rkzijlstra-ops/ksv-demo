export type Urgentie = "rood" | "geel" | null;
export type Bron = "pdf" | "monteur";

export interface BadgeConfig {
  label: string;
  bg: string;
  ink: string;
  icon: "alert" | "clock" | "document" | "wrench";
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
