"use client";

import { useEffect } from "react";

/**
 * Waarschuwt de gebruiker (browser-dialoog "weet je het zeker?") bij het verlaten,
 * verversen of sluiten van de pagina zolang `actief` true is. Gebruikt voor lopende
 * uploads/versturen, zodat je niet per ongeluk je werk kwijtraakt.
 *
 * Let op: dit vangt verversen/sluiten/weg-navigeren van de site af. In-app terug-knoppen
 * (client-side navigatie) vallen hier niet onder; houd uploads daarom kort.
 */
export function useVerlaatWaarschuwing(actief: boolean) {
  useEffect(() => {
    if (!actief) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [actief]);
}
