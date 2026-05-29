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
    return { label: "Spoed verstuurd", bg: "bg-urgent-rood", ink: "text-white", icon: "alert" };
  }
  if (spoed) {
    return { label: "Spoed", bg: "bg-urgent-rood", ink: "text-white", icon: "alert" };
  }
  return { label: "Open", bg: "bg-urgent-geel", ink: "text-ink", icon: "clock" };
}

/** Groene "opgeleverd"-badge. */
export function opgeleverdBadgeConfig(): BadgeConfig {
  return { label: "Opgeleverd", bg: "bg-success", ink: "text-white", icon: "check" };
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
