"use client";

import { Children, useState, type ReactNode } from "react";

/**
 * Eenvoudige tabs. Labels als string-array, de panelen als children (in dezelfde volgorde).
 * Alleen het actieve paneel wordt getoond. Children-patroon zodat server-gerenderde inhoud
 * (incl. client-componenten) betrouwbaar wordt doorgegeven.
 */
export function Tabs({ labels, children }: { labels: string[]; children: ReactNode }) {
  const [actief, setActief] = useState(0);
  const panels = Children.toArray(children);

  return (
    <div>
      <div role="tablist" className="flex border-b border-line">
        {labels.map((label, i) => (
          <button
            key={label}
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
            {label}
          </button>
        ))}
      </div>
      <div className="mt-4">{panels[actief]}</div>
    </div>
  );
}
