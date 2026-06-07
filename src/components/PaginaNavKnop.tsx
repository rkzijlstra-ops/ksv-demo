import Link from "next/link";
import { CalendarDays, LayoutDashboard } from "lucide-react";

/**
 * Vaste navigatieknop tussen dashboard en planbord, zelfde uitstraling op beide pagina's en zowel boven
 * als onder de inhoud te plaatsen.
 */
export function PaginaNavKnop({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: "agenda" | "dashboard";
}) {
  const Icon = icon === "agenda" ? CalendarDays : LayoutDashboard;
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 border-2 border-primary bg-white px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
    >
      <Icon size={16} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </Link>
  );
}
