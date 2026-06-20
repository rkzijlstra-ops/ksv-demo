"use client";

import { useSyncExternalStore } from "react";

/**
 * Gedeelde status van de oplever-uploads (foto's en video), als kleine store met huidige waarde plus
 * abonnement. Anders dan een pure event-bus houdt deze de stand vast, zodat een component dat later
 * mount (bv. de Terug-knop boven de pagina) meteen weet of er nog iets uploadt.
 *
 * Gebruik:
 * - OpleverFotos / VideoMaken melden hun bezig-status (zetFotoBezig / zetVideoBezig).
 * - OpleverFlow en de Terug-knop lezen via useOpleverUpload() om te waarschuwen vóór weg-navigeren.
 * - Blok C (serialiseren) gebruikt fotoBezig/videoBezig om foto en video na elkaar te laten lopen.
 *
 * De stand wordt uitsluitend client-side gemuteerd (in effects/handlers), dus de module-state lekt
 * niet tussen server-requests.
 */

export interface UploadStatus {
  fotoBezig: boolean;
  videoBezig: boolean;
}

let status: UploadStatus = { fotoBezig: false, videoBezig: false };
// Stabiele referentie voor de server-snapshot (useSyncExternalStore eist een constante op de server).
const SERVER_STATUS: UploadStatus = { fotoBezig: false, videoBezig: false };
const abonnees = new Set<() => void>();

function publiceer() {
  abonnees.forEach((fn) => fn());
}

export function zetFotoBezig(bezig: boolean): void {
  if (status.fotoBezig === bezig) return;
  status = { ...status, fotoBezig: bezig };
  publiceer();
}

export function zetVideoBezig(bezig: boolean): void {
  if (status.videoBezig === bezig) return;
  status = { ...status, videoBezig: bezig };
  publiceer();
}

/** Live stand (stabiele referentie tussen wijzigingen; geschikt als getSnapshot). */
export function leesUploadStatus(): UploadStatus {
  return status;
}

export function ietsUploadBezig(): boolean {
  return status.fotoBezig || status.videoBezig;
}

export function abonneerUploadStatus(fn: () => void): () => void {
  abonnees.add(fn);
  return () => {
    abonnees.delete(fn);
  };
}

/** React-hook: huidige upload-status, re-rendert bij wijziging. */
export function useOpleverUpload(): UploadStatus & { ietsBezig: boolean } {
  const s = useSyncExternalStore(abonneerUploadStatus, leesUploadStatus, () => SERVER_STATUS);
  return { ...s, ietsBezig: s.fotoBezig || s.videoBezig };
}
