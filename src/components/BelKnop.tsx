import { Phone } from "lucide-react";

export function BelKnop({ telefoon }: { telefoon: string | null }) {
  if (!telefoon) return null;

  return (
    <a
      href={`tel:${telefoon.replace(/\s/g, "")}`}
      className="flex min-h-[56px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-none border-2 border-primary bg-white px-2 py-3 text-sm font-bold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Phone size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
      Bellen
    </a>
  );
}
