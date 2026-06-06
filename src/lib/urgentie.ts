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
  /** Tailwind class voor de border-kleur. Default in Badge is border-current. */
  border?: string;
  icon: "alert" | "clock" | "document" | "wrench" | "package" | "edit" | "check";
}

/** Badge-config voor bron (waar de regel vandaan komt). */
export function bronConfig(bron: Bron): BadgeConfig {
  if (bron === "pdf") {
    return { label: "Opdracht", bg: "bg-surface", ink: "text-ink-muted", icon: "document" };
  }
  return { label: "Melding", bg: "bg-surface", ink: "text-ink-muted", icon: "wrench" };
}

/**
 * Kleur-staat-taal (2A.7): rood = spoed, amber = open/wacht op oplevering, groen = opgeleverd.
 * Altijd kleur + icoon + label (niet kleur alleen).
 */
export function meldingStaatConfig(spoed: boolean, spoedVerzondenAt: string | null): BadgeConfig {
  if (spoed && spoedVerzondenAt) {
    return { label: "Spoed verstuurd", bg: "bg-urgent-rood", ink: "text-white", border: "border-urgent-rood", icon: "alert" };
  }
  if (spoed) {
    return { label: "Spoed", bg: "bg-urgent-rood", ink: "text-white", border: "border-urgent-rood", icon: "alert" };
  }
  // open = outlined oranje (industrieel D)
  return { label: "Open", bg: "bg-white", ink: "text-accent", border: "border-accent", icon: "clock" };
}

/** Groene "opgeleverd"-badge, solid (industrieel D). */
export function opgeleverdBadgeConfig(): BadgeConfig {
  return { label: "Opgeleverd", bg: "bg-success", ink: "text-white", border: "border-success", icon: "check" };
}

/**
 * Bevestig-status van een klus als badge voor de monteur-werkpool. Geel "Te bevestigen" zolang de
 * klus verstuurd maar niet bevestigd is (status gepland), groen "Bevestigd" daarna. Andere statussen
 * (binnen, concept, opgeleverd, geannuleerd) geven null: daar valt niets te bevestigen.
 */
export function bevestigBadgeConfig(dashboardStatus: string): BadgeConfig | null {
  if (dashboardStatus === "gepland") {
    return { label: "Te bevestigen", bg: "bg-urgent-geel", ink: "text-ink", border: "border-urgent-geel", icon: "clock" };
  }
  if (dashboardStatus === "bevestigd") {
    return { label: "Bevestigd", bg: "bg-bevestigd", ink: "text-white", border: "border-bevestigd", icon: "check" };
  }
  return null;
}

/** Badge-config voor documenttype (montage / service / handmatig). null = geen badge. */
export function documenttypeConfig(type: Documenttype): BadgeConfig | null {
  // Outlined in industrieel D: wit met anthraciet rand en tekst.
  if (type === "orderbevestiging") {
    return { label: "Montage", bg: "bg-white", ink: "text-ink", border: "border-ink", icon: "package" };
  }
  if (type === "werkbon_service") {
    return { label: "Service", bg: "bg-white", ink: "text-ink", border: "border-ink", icon: "wrench" };
  }
  if (type === "tekst") {
    return { label: "Handmatig", bg: "bg-white", ink: "text-ink", border: "border-ink", icon: "edit" };
  }
  return null;
}
