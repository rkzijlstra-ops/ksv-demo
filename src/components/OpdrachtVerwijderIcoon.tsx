"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";

/**
 * Prullenbakje rechtsboven op een opdracht-kaart in de werkbak. Zit in de klikbare kaart,
 * dus het onderschept de klik (geen navigatie) en opent het bevestig-venster (wissen/annuleren).
 */
export function OpdrachtVerwijderIcoon({
  opdrachtId,
  klantNaam,
}: {
  opdrachtId: string;
  klantNaam: string;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);

  async function verwijder(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (
      !window.confirm(
        `Klus "${klantNaam}" verwijderen? De documenten en meldingen gaan ook weg.`,
      )
    )
      return;
    setBezig(true);
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
        vernieuwOfflineCache();
      }
    } finally {
      setBezig(false);
    }
  }

  return (
    <button
      type="button"
      onClick={verwijder}
      disabled={bezig}
      aria-label={`Klus ${klantNaam} verwijderen`}
      className="absolute right-2 top-2 z-10 inline-flex h-8 w-8 cursor-pointer items-center justify-center border border-urgent-rood bg-white text-urgent-rood transition-colors duration-150 hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-accent"
    >
      {bezig ? (
        <Loader2 size={15} className="animate-spin" aria-hidden="true" />
      ) : (
        <Trash2 size={15} strokeWidth={2.5} aria-hidden="true" />
      )}
    </button>
  );
}
