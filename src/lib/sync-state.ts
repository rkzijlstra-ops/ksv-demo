/**
 * Mini event-bus voor offline-state. Houdt de UI gesynchroniseerd zonder
 * een echte React Context (te veel boilerplate voor 3 variabelen).
 *
 * Producers (queue.ts, sync.ts) roepen publishQueueGewijzigd() / publishSyncBezig()
 * aan. Consumers (OfflineStrip, knoppen, pending-melding-lijst) gebruiken
 * useOfflineState() en re-renderen vanzelf.
 */

const QUEUE_EVENT = "ksv:queue-gewijzigd";
const SYNC_EVENT = "ksv:sync-bezig";

export function publishQueueGewijzigd(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(QUEUE_EVENT));
}

export function publishSyncBezig(bezig: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: bezig }));
}

export function abonneerOpQueue(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(QUEUE_EVENT, callback);
  return () => window.removeEventListener(QUEUE_EVENT, callback);
}

export function abonneerOpSync(callback: (bezig: boolean) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const ce = e as CustomEvent<boolean>;
    callback(ce.detail);
  };
  window.addEventListener(SYNC_EVENT, handler);
  return () => window.removeEventListener(SYNC_EVENT, handler);
}
