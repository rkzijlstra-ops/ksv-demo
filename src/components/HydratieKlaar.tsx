"use client";

import { useEffect } from "react";

/**
 * Zet `data-hydrated="1"` op het <html>-element zodra deze (client-)subtree in de browser is
 * gehydrateerd. Rendert niets. Bedoeld als betrouwbaar startsein voor end-to-end-tests die een
 * bestand uploaden: React koppelt de change-handler van een file-input pas bij hydratie, dus een
 * test die de file eerder aanlevert verliest het change-event (de upload gebeurt dan niet). Plaats
 * dit component binnen een upload-component, zodat de markering precies die subtree dekt; pagina's
 * met een loading.tsx hydrateren onder een eigen Suspense-grens, los van de layout.
 */
export function HydratieKlaar() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "1";
  }, []);
  return null;
}
