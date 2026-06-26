"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileCheck, AlertTriangle, AlertCircle, HelpCircle, Send } from "lucide-react";
import { TerugKnop } from "@/components/TerugKnop";
import { FotoMaken } from "./FotoMaken";
import { VideoMaken } from "@/components/VideoMaken";
import { SpraakOpname } from "./SpraakOpname";
import { vernieuwOfflineCache } from "@/lib/sw-cache";
import { voegToeAanQueue } from "@/lib/queue";

const LOCAL_PREFIX = "local:";

export interface BestaandeMelding {
  id: string;
  spoed: boolean;
  ruwe_tekst: string | null;
  foto_urls: string[];
  video_url: string | null;
}

export function MeldingForm({
  opdrachtId,
  bestaand,
  terugHref,
  kop,
}: {
  opdrachtId: string;
  bestaand?: BestaandeMelding;
  /** URL voor de "Terug naar opdracht"-link bovenaan; krijgt een dirty-check. */
  terugHref: string;
  /** Kop-elementen tussen back-link en formulier (h1 + evt. versie-info). */
  kop?: React.ReactNode;
}) {
  const router = useRouter();
  const isBewerken = Boolean(bestaand);
  const initialTekst = bestaand?.ruwe_tekst ?? "";
  const initialFotoUrls = bestaand?.foto_urls ?? [];
  const initialVideoUrl = bestaand?.video_url ?? null;
  const initialSpoed = bestaand?.spoed ?? false;

  const [tekst, setTekst] = useState(initialTekst);
  const [fotoUrls, setFotoUrls] = useState<string[]>(initialFotoUrls);
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [spoed, setSpoed] = useState(initialSpoed);
  const [toonUitleg, setToonUitleg] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  const isDirty =
    !bezig &&
    (tekst.trim() !== initialTekst.trim() ||
      fotoUrls.length !== initialFotoUrls.length ||
      fotoUrls.some((u, i) => u !== initialFotoUrls[i]) ||
      videoUrl !== initialVideoUrl ||
      spoed !== initialSpoed);

  function handleTerugClick(e: React.MouseEvent) {
    if (isDirty && !window.confirm("Melding nog niet opgeslagen. Weggooien en terug?")) {
      e.preventDefault();
    }
  }
  // melding-id na opslaan, voor het opnieuw proberen van een mislukte spoed-mail
  const [retryId, setRetryId] = useState<string | null>(null);

  async function spoedVersturen(id: string): Promise<boolean> {
    const res = await fetch(`/api/meldingen/${id}/spoed-versturen`, { method: "POST" });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setFout(b.error ?? `Spoed versturen mislukt (${res.status})`);
      setRetryId(id);
      return false;
    }
    return true;
  }

  async function opslaan() {
    if (spoed) {
      const ok = window.confirm(
        "Deze melding NU als spoed versturen? Hij gaat meteen los naar kantoor (en komt later ook in het opleverrapport).",
      );
      if (!ok) return;
    }

    // Offline-route: alleen voor nieuwe meldingen. Bewerken offline is niet
    // ondersteund (te complex vs. risico op conflicten met de server).
    // Video is bewust niet in de offline-queue: VideoMaken uploadt direct en is online-only,
    // dus offline is er geen video om mee te nemen. Een online opgenomen video net vóór het
    // offline gaan valt buiten deze (zeldzame) route.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (bestaand) {
        setFout("Bewerken kan alleen met netwerk. Probeer opnieuw zodra je verbinding hebt.");
        return;
      }
      setBezig(true);
      setFout("");
      try {
        const echteUrls = fotoUrls.filter((u) => !u.startsWith(LOCAL_PREFIX));
        const localIds = fotoUrls
          .filter((u) => u.startsWith(LOCAL_PREFIX))
          .map((u) => u.slice(LOCAL_PREFIX.length));
        await voegToeAanQueue({
          opdracht_id: opdrachtId,
          spoed,
          ruwe_tekst: tekst.trim() || null,
          foto_urls: echteUrls,
          foto_local_ids: localIds,
        });
        window.alert(
          "Opgeslagen op je telefoon. Wordt verstuurd zodra je weer netwerk hebt.",
        );
        router.push(`/opdracht/${opdrachtId}`);
        router.refresh();
        return;
      } catch (err) {
        setFout(`Opslaan offline mislukt: ${(err as Error).message}`);
        setBezig(false);
        return;
      }
    }

    setBezig(true);
    setFout("");
    setRetryId(null);
    try {
      const res = await fetch(
        bestaand ? `/api/meldingen/${bestaand.id}` : "/api/meldingen",
        {
          method: bestaand ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(
            bestaand
              ? { spoed, ruwe_tekst: tekst.trim() || null, foto_urls: fotoUrls, video_url: videoUrl, status: "verzonden" }
              : { opdracht_id: opdrachtId, spoed, ruwe_tekst: tekst.trim() || null, foto_urls: fotoUrls, video_url: videoUrl },
          ),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Opslaan mislukt (${res.status})`);

      const id: string = bestaand ? bestaand.id : body.id;
      if (spoed) {
        const verstuurd = await spoedVersturen(id);
        if (!verstuurd) {
          setBezig(false);
          return; // melding is opgeslagen, spoed-mail mislukt -> retry mogelijk
        }
      }
      router.push(`/opdracht/${opdrachtId}`);
      router.refresh();
      vernieuwOfflineCache();
    } catch (err) {
      setFout((err as Error).message);
      setBezig(false);
    }
  }

  async function opnieuwSpoed() {
    if (!retryId) return;
    setBezig(true);
    setFout("");
    const verstuurd = await spoedVersturen(retryId);
    if (verstuurd) {
      router.push(`/opdracht/${opdrachtId}`);
      router.refresh();
      vernieuwOfflineCache();
    } else {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <TerugKnop href={terugHref} label="Terug naar klus" onClick={handleTerugClick} />

      {kop}

      {/* Foto bovenaan: natuurlijke volgorde tijdens het werk */}
      <div>
        <span className="mb-2 block font-semibold text-ink">Foto&apos;s</span>
        <FotoMaken urls={fotoUrls} onChange={setFotoUrls} />
      </div>

      {/* Video (optioneel): zelfde component als de oplevering. Online-only. */}
      <div>
        <span className="mb-2 block font-semibold text-ink">
          Video <span className="font-normal text-ink-muted">· optioneel</span>
        </span>
        <VideoMaken url={videoUrl} onChange={setVideoUrl} />
      </div>

      <div>
        <label htmlFor="tekst" className="mb-2 block font-semibold text-ink">
          Wat is er aan de hand?
        </label>
        <textarea
          id="tekst"
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          rows={4}
          placeholder="Typ of spreek je melding in"
          className="w-full rounded-none border border-line p-4 font-[family-name:var(--font-body)] text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
        />
        <div className="mt-2">
          <SpraakOpname onTekst={(t) => setTekst((prev) => (prev ? `${prev} ${t}` : t))} />
        </div>
      </div>

      {/* Spoed-keuze (uitzondering) */}
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpoed((v) => !v)}
            aria-pressed={spoed}
            className={`inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-none border-2 px-4 font-bold transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-primary ${
              spoed ? "border-transparent bg-urgent-rood text-white" : "border-line bg-white text-ink"
            }`}
          >
            <AlertTriangle size={20} strokeWidth={2.5} aria-hidden="true" />
            Spoed{spoed ? " aan" : ""}
          </button>
          <button
            type="button"
            onClick={() => setToonUitleg((v) => !v)}
            aria-label="Uitleg over spoed"
            aria-expanded={toonUitleg}
            className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-none text-ink-muted hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
          >
            <HelpCircle size={22} aria-hidden="true" />
          </button>
        </div>
        {toonUitleg && (
          <p className="mt-2 rounded-none bg-surface p-3 text-sm text-ink">
            Spoed = nu meteen los naar kantoor, buiten de oplevering om. Alleen gebruiken als het echt
            niet kan wachten. De melding komt daarna ook gewoon in het opleverrapport.
          </p>
        )}
      </div>

      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      {retryId ? (
        <button
          type="button"
          onClick={opnieuwSpoed}
          disabled={bezig}
          className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-urgent-rood px-4 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          {bezig ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Send size={20} strokeWidth={2.5} aria-hidden="true" />}
          Spoed opnieuw versturen
        </button>
      ) : (
        <button
          type="button"
          onClick={opslaan}
          disabled={bezig}
          className={`relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 px-4 text-base font-extrabold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-[''] ${
            spoed ? "bg-urgent-rood" : "bg-primary"
          }`}
        >
          {bezig ? (
            <Loader2 size={20} className="animate-spin" aria-hidden="true" />
          ) : spoed ? (
            <Send size={20} strokeWidth={2.5} aria-hidden="true" />
          ) : (
            <FileCheck size={20} strokeWidth={2.5} aria-hidden="true" />
          )}
          {spoed ? "Nu als spoed versturen" : isBewerken ? "Bijwerken in rapport" : "Toevoegen aan rapport"}
        </button>
      )}
    </div>
  );
}
