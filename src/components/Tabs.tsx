"use client";

import { useState, type ReactNode } from "react";

/**
 * Eenvoudige tabs. De inhoud per tab wordt als (server-gerenderde) node meegegeven,
 * zodat server-componenten server blijven en alleen het wisselen client-side is.
 */
export function Tabs({
  tabs,
}: {
  tabs: { label: string; inhoud: ReactNode }[];
}) {
  const [actief, setActief] = useState(0);

  return (
    <div>
      <div role="tablist" className="flex border-b border-line">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={i === actief}
            onClick={() => setActief(i)}
            className={`min-h-[48px] flex-1 cursor-pointer px-3 text-sm font-extrabold uppercase tracking-[0.06em] transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-accent ${
              i === actief
                ? "border-b-[3px] border-primary text-primary"
                : "border-b-[3px] border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="mt-4">{tabs[actief]?.inhoud}</div>
    </div>
  );
}
