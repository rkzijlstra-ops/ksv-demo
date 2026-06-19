"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Ververst in de DEMO-omgeving periodiek de server-data, zodat een wijziging op het ene scherm vanzelf
 * op het andere verschijnt (de twee-kanten-magie). Waarborgen tegen het wissen van invoer: niet
 * verversen terwijl een venster openstaat, terwijl iemand in een veld typt, of als het tabblad
 * onzichtbaar is. Alleen gemount in demo-modus; bestaat dus niet in productie.
 */
export function DemoAutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      if (document.querySelector('[role="dialog"], [aria-modal="true"]')) return;
      const actief = document.activeElement?.tagName;
      if (actief && ["INPUT", "TEXTAREA", "SELECT"].includes(actief)) return;
      router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
