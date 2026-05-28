import { Phone } from "lucide-react";

export function BelKnop({ telefoon }: { telefoon: string | null }) {
  if (!telefoon) return null;

  return (
    <a
      href={`tel:${telefoon.replace(/\s/g, "")}`}
      className="flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-primary bg-white px-4 py-3 text-base font-bold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Phone size={22} strokeWidth={2.5} aria-hidden="true" />
      Bel klant
    </a>
  );
}
