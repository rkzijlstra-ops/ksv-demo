"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, Image as ImageIcon, Loader2, X, AlertCircle, RefreshCw } from "lucide-react";
import { compressImage } from "@/lib/foto-compress";
import { useQuota } from "@/lib/use-quota";
import { HydratieKlaar } from "@/components/HydratieKlaar";
import { zetFotoBezig, leesUploadStatus } from "@/lib/oplever-upload-status";
import {
  maakItems,
  voegToe,
  markeerBezig,
  markeerKlaar,
  markeerMislukt,
  opnieuw as queueOpnieuw,
  verwijderItem,
  aantalKlaar,
  aantalTotaal,
  ietsBezig,
  heeftMislukte,
  type UploadItem,
} from "@/lib/foto-upload-queue";

/**
 * Foto's vastleggen bij de oplevering. Uploadt per foto los: zodra er één klaar is verschijnt hij
 * meteen als thumbnail en wordt hij in het concept opgeslagen (via onFotoKlaar). Zo gaat er bij weg-
 * navigeren of een fout nooit een hele batch verloren, en ziet de monteur de voortgang lopen.
 *
 * Bewust apart van FotoMaken (dat de meldingen-flow met offline-queue bedient). De oplever-flow is
 * online-only: versturen kan niet offline. Mislukt een upload (bv. geen netwerk), dan krijgt die ene
 * foto een "opnieuw"-knop; de rest blijft staan.
 */
export function OpleverFotos({
  urls,
  onFotoKlaar,
  onFotoVerwijder,
}: {
  /** Reeds vastgelegde foto-urls (uit het concept); getoond als thumbnails. */
  urls: string[];
  /** Eén foto is klaar geüpload: voeg de url toe aan het concept (functioneel, race-vrij). */
  onFotoKlaar: (url: string) => void;
  /** Een vastgelegde foto verwijderen uit het concept. */
  onFotoVerwijder: (url: string) => void;
}) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [fout, setFout] = useState("");
  const [wachtOpVideo, setWachtOpVideo] = useState(false);
  const { niveau: quotaNiveau } = useQuota();
  const quotaVol = quotaNiveau === "vol";
  const mountedRef = useRef(true);
  useEffect(() => () => {
    mountedRef.current = false;
  }, []);

  // Werk-refs: de upload-lus draait los van de async React-state, dus we houden de te-verwerken ids,
  // de bijbehorende bestanden en de abort-controllers in refs bij.
  const queueRef = useRef<string[]>([]);
  const fileMapRef = useRef<Map<string, File>>(new Map());
  const controllersRef = useRef<Map<string, AbortController>>(new Map());
  const draaitRef = useRef(false);
  // onFotoKlaar via ref, zodat de langlopende lus altijd de actuele callback aanroept.
  const onKlaarRef = useRef(onFotoKlaar);
  useEffect(() => {
    onKlaarRef.current = onFotoKlaar;
  }, [onFotoKlaar]);

  // Bij unmount alle lopende uploads afbreken (geen half bestand, geen schrijven naar een weg component).
  useEffect(() => {
    const controllers = controllersRef.current;
    return () => {
      controllers.forEach((c) => c.abort());
    };
  }, []);

  // Bezig-status delen, zodat de verlaat-waarschuwing en de video-serialisatie weten dat er foto's lopen.
  useEffect(() => {
    zetFotoBezig(ietsBezig(items));
  }, [items]);
  useEffect(() => () => zetFotoBezig(false), []);

  async function verwerk() {
    if (draaitRef.current) return;
    draaitRef.current = true;
    try {
      while (queueRef.current.length > 0) {
        // Serialiseren: uploadt er net een video, wacht dan tot die klaar is (niet tegelijk uploaden).
        if (leesUploadStatus().videoBezig) {
          setWachtOpVideo(true);
          while (leesUploadStatus().videoBezig && mountedRef.current) {
            await new Promise((r) => setTimeout(r, 200));
          }
          setWachtOpVideo(false);
        }
        if (!mountedRef.current) return;
        const id = queueRef.current.shift()!;
        const file = fileMapRef.current.get(id);
        if (!file) continue; // tussentijds verwijderd
        setItems((prev) => markeerBezig(prev, id));
        const controller = new AbortController();
        controllersRef.current.set(id, controller);
        try {
          const blob = await compressImage(file);
          const fd = new FormData();
          fd.append("foto", blob, "foto.jpg");
          const res = await fetch("/api/upload-foto", {
            method: "POST",
            body: fd,
            signal: controller.signal,
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error ?? `Upload mislukt (${res.status})`);
          setItems((prev) => markeerKlaar(prev, id, body.url));
          onKlaarRef.current(body.url);
          fileMapRef.current.delete(id);
        } catch (err) {
          if (controller.signal.aborted) {
            // Bewust afgebroken (verwijderd of weg-genavigeerd): geen mislukt-tegel tonen.
            setItems((prev) => verwijderItem(prev, id));
            fileMapRef.current.delete(id);
          } else {
            setItems((prev) => markeerMislukt(prev, id, (err as Error).message));
          }
        } finally {
          controllersRef.current.delete(id);
        }
      }
    } finally {
      draaitRef.current = false;
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setFout("");
    const nieuwe = files.map((file) => ({ id: crypto.randomUUID(), file }));
    nieuwe.forEach((n) => fileMapRef.current.set(n.id, n.file));
    const ids = nieuwe.map((n) => n.id);
    // Is de vorige batch helemaal klaar (niets bezig, niets mislukt), dan begin de teller vers; loopt er
    // nog iets of staat er een mislukte foto, dan voeg toe zodat die zichtbaar blijft en de teller doortelt.
    setItems((prev) => (ietsBezig(prev) || heeftMislukte(prev) ? voegToe(prev, ids) : maakItems(ids)));
    queueRef.current.push(...ids);
    void verwerk();
  }

  /** Een mislukte foto opnieuw in de wachtrij zetten. */
  function probeerOpnieuw(id: string) {
    if (!fileMapRef.current.has(id)) return;
    setItems((prev) => queueOpnieuw(prev, id));
    queueRef.current.push(id);
    void verwerk();
  }

  /** Een nog niet voltooide (bezig/wachtend/mislukt) tegel weghalen: upload afbreken en item wissen. */
  function annuleerItem(id: string) {
    controllersRef.current.get(id)?.abort();
    controllersRef.current.delete(id);
    fileMapRef.current.delete(id);
    queueRef.current = queueRef.current.filter((q) => q !== id);
    setItems((prev) => verwijderItem(prev, id));
  }

  const bezigItems = items.filter((i) => i.status !== "klaar");
  const toonTeller = items.length > 0 && ietsBezig(items);

  return (
    <div>
      <HydratieKlaar />
      <div className="flex gap-2">
        <label
          className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
            quotaVol ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-line/40"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            disabled={quotaVol}
            onChange={handleFiles}
          />
          <Camera size={22} strokeWidth={2.5} aria-hidden="true" />
          Camera
        </label>
        <label
          className={`flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-3 py-3 text-base font-semibold text-ink transition-colors duration-150 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary ${
            quotaVol ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-line/40"
          }`}
        >
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={quotaVol}
            onChange={handleFiles}
          />
          <ImageIcon size={22} strokeWidth={2.5} aria-hidden="true" />
          Galerij
        </label>
      </div>

      {toonTeller && (
        <div
          className="mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-none border-2 border-dashed border-line bg-surface px-4 py-2 text-base font-semibold text-ink"
          aria-live="polite"
        >
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          {wachtOpVideo
            ? "Wacht tot de video klaar is…"
            : `Foto's uploaden… ${aantalKlaar(items)} van ${aantalTotaal(items)}`}
        </div>
      )}

      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      {(urls.length > 0 || bezigItems.length > 0) && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {urls.map((url) => (
            <div key={url} className="relative">
              <div className="relative aspect-square w-full overflow-hidden rounded-none border border-line">
                <Image
                  src={url}
                  alt="Gemaakte foto"
                  fill
                  sizes="(min-width: 640px) 160px, 33vw"
                  className="object-cover"
                  loading="lazy"
                />
              </div>
              <button
                type="button"
                onClick={() => onFotoVerwijder(url)}
                aria-label="Foto verwijderen"
                className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-urgent-rood text-white shadow"
              >
                <X size={16} strokeWidth={3} aria-hidden="true" />
              </button>
            </div>
          ))}

          {bezigItems.map((item) => (
            <div key={item.id} className="relative">
              <div
                className={`flex aspect-square w-full items-center justify-center rounded-none border ${
                  item.status === "mislukt" ? "border-urgent-rood bg-urgent-rood/10" : "border-line bg-surface"
                }`}
              >
                {item.status === "mislukt" ? (
                  <div className="flex flex-col items-center gap-1 p-1 text-center">
                    <AlertCircle size={22} strokeWidth={2.5} className="text-urgent-rood" aria-hidden="true" />
                    <button
                      type="button"
                      onClick={() => probeerOpnieuw(item.id)}
                      aria-label="Foto opnieuw uploaden"
                      className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 border border-ink px-2 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface"
                    >
                      <RefreshCw size={13} strokeWidth={2.5} aria-hidden="true" />
                      Opnieuw
                    </button>
                  </div>
                ) : (
                  <Loader2 size={26} className="animate-spin text-ink-muted" aria-hidden="true" />
                )}
              </div>
              <button
                type="button"
                onClick={() => annuleerItem(item.id)}
                aria-label="Upload annuleren"
                className="absolute -right-2 -top-2 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-urgent-rood text-white shadow"
              >
                <X size={16} strokeWidth={3} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
