import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { MouseEvent } from "react";

/**
 * Terug-knop: omkaderd met een pijl. Eén plek voor de look, overal hergebruikt.
 * Optionele onClick voor bijvoorbeeld een "niet-opgeslagen"-check.
 */
export function TerugKnop({
  href,
  label,
  onClick,
}: {
  href: string;
  label: string;
  onClick?: (e: MouseEvent) => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-none border-2 border-primary px-3 text-sm font-bold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <ChevronLeft size={20} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </Link>
  );
}
