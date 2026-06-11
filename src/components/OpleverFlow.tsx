"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, PackageCheck, PenLine, CheckCircle2, Mic, ChevronLeft, Eye, CloudOff } from "lucide-react";
import { useOfflineState } from "@/lib/use-offline-state";
import { FotoMaken } from "@/components/FotoMaken";
import { VideoMaken } from "@/components/VideoMaken";
import { HandtekeningModal } from "@/components/HandtekeningModal";
import { SpraakOpname } from "@/components/SpraakOpname";
import { Voortgang } from "@/components/Voortgang";
import { controleerOplevering } from "@/lib/oplever-validatie";
import { dataUrlNaarBlob, uploadHandtekening } from "@/lib/handtekening";
import { useVerlaatWaarschuwing } from "@/lib/use-verlaat-waarschuwing";
import { KEUKENZAKEN } from "@/lib/keukenzaken";
import { CONTROLE_PUNTEN } from "@/lib/oplever-controle";
import type { Adres } from "@/lib/db";

export function OpleverFlow({ opdrachtId }: { opdrachtId: string }) {
  const router = useRouter();
  const { online } = useOfflineState();
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [opmerking, setOpmerking] = useState("");
  // Controlepunt dat de klant aftekent: true = akkoord, false = niet akkoord, null = nog niet gekozen.
  const [controleAkkoord, setControleAkkoord] = useState<boolean | null>(null);
  const [rapportEmail, setRapportEmail] = useState("");
  const [handmatig, setHandmatig] = useState(false);
  // Persoonlijk adresboek van de monteur: vaste ontvangers met een naam, te kiezen of toe te voegen.
  const [adresboek, setAdresboek] = useState<Adres[]>([]);
  const [bewaarAdres, setBewaarAdres] = useState(false);
  const [nieuwAdresNaam, setNieuwAdresNaam] = useState("");
  const [adresBezig, setAdresBezig] = useState(false);
  // Een opgeslagen adres aanpassen (inline): id van het adres in bewerking, plus de bewerkvelden.
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [bewerkNaam, setBewerkNaam] = useState("");
  const [bewerkEmail, setBewerkEmail] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  // De handtekening wordt meteen bij "Klaar" geüpload en als URL bewaard (net als foto's en video),
  // zodat hij in elke tussentijdse opslag meegaat en een herlaad/terugkeer overleeft.
  const [handtekeningUrl, setHandtekeningUrl] = useState<string | null>(null);
  const [handtekeningBezig, setHandtekeningBezig] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");

  useVerlaatWaarschuwing(bezig);

  const geladenRef = useRef(false);
  // Concept-saves serialiseren: elke opslag wacht op de vorige. Zonder dit zijn de saves
  // fire-and-forget en kan een eerdere (met verouderde state, bv. nog lege opmerking) een latere
  // overschrijven door out-of-order aankomst bij de server. Nu wint altijd de laatst getriggerde.
  const opslaanChainRef = useRef<Promise<unknown>>(Promise.resolve());

  // Bestaand concept laden bij binnenkomst, zodat een halve oplevering (incl. de geuploade
  // video) bewaard blijft als je tussendoor naar de werkpool gaat en terugkomt.
  useEffect(() => {
    let actief = true;
    (async () => {
      try {
        const res = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`);
        if (res.ok && actief) {
          const { oplevering } = await res.json();
          if (oplevering) {
            setFotoUrls(oplevering.eindstaat_foto_urls ?? []);
            setVideoUrl(oplevering.video_url ?? null);
            setHandtekeningUrl(oplevering.handtekening_url ?? null);
            setOpmerking(oplevering.opmerking ?? "");
            const c = Array.isArray(oplevering.controle) ? oplevering.controle : [];
            setControleAkkoord(c.length > 0 ? Boolean(c[0].akkoord) : null);
            const em: string = oplevering.rapport_email ?? "";
            setRapportEmail(em);
            if (em && !KEUKENZAKEN.some((z) => z.email === em)) setHandmatig(true);
          }
        }
      } finally {
        geladenRef.current = true;
      }
    })();
    return () => {
      actief = false;
    };
  }, [opdrachtId]);

  // Adresboek van de monteur laden (vaste ontvangers).
  useEffect(() => {
    let actief = true;
    fetch("/api/adresboek")
      .then((r) => (r.ok ? r.json() : { adressen: [] }))
      .then((d) => {
        if (actief) setAdresboek(d.adressen ?? []);
      })
      .catch(() => {});
    return () => {
      actief = false;
    };
  }, []);

  // Reconcile: is het huidige adres een bekende keuze (zaak of opgeslagen adres), dan niet in de
  // handmatig-modus blijven hangen (bv. na het laden van het adresboek bij een heropend concept).
  useEffect(() => {
    if (!handmatig) return;
    const bekend =
      KEUKENZAKEN.some((z) => z.email === rapportEmail) ||
      adresboek.some((a) => a.email === rapportEmail);
    if (bekend) setHandmatig(false);
  }, [adresboek, rapportEmail, handmatig]);

  /** Slaat het zojuist getypte adres op in het adresboek en kiest het meteen. */
  async function bewaarNieuwAdres() {
    const email = rapportEmail.trim();
    const naam = nieuwAdresNaam.trim();
    if (!naam || !email.includes("@")) return;
    setAdresBezig(true);
    try {
      const res = await fetch("/api/adresboek", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email }),
      });
      if (res.ok) {
        const { id } = await res.json();
        setAdresboek((prev) =>
          [...prev, { id, naam, email }].sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
        );
        setHandmatig(false);
        setBewaarAdres(false);
        setNieuwAdresNaam("");
        bewaarConcept(email);
      }
    } finally {
      setAdresBezig(false);
    }
  }

  /** Verwijdert een opgeslagen adres en wist de keuze als dat adres gekozen was. */
  async function verwijderAdresUit(a: Adres) {
    if (!window.confirm(`"${a.naam}" uit je adresboek verwijderen?`)) return;
    setAdresBezig(true);
    try {
      const res = await fetch(`/api/adresboek/${a.id}`, { method: "DELETE" });
      if (res.ok) {
        setAdresboek((prev) => prev.filter((x) => x.id !== a.id));
        if (rapportEmail === a.email) {
          setRapportEmail("");
          bewaarConcept("");
        }
      }
    } finally {
      setAdresBezig(false);
    }
  }

  /** Slaat een aanpassing van een opgeslagen adres op (naam en/of e-mail). */
  async function bewaarBewerking() {
    if (!bewerkId) return;
    const naam = bewerkNaam.trim();
    const email = bewerkEmail.trim();
    if (!naam || !email.includes("@")) return;
    setAdresBezig(true);
    try {
      const res = await fetch(`/api/adresboek/${bewerkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email }),
      });
      if (res.ok) {
        setAdresboek((prev) =>
          prev
            .map((x) => (x.id === bewerkId ? { ...x, naam, email } : x))
            .sort((a, b) => a.naam.localeCompare(b.naam, "nl")),
        );
        setRapportEmail(email);
        bewaarConcept(email);
        setBewerkId(null);
      }
    } finally {
      setAdresBezig(false);
    }
  }

  function bewaarConcept(emailOverride?: string) {
    if (!geladenRef.current) return;
    const rapport_email =
      emailOverride !== undefined ? emailOverride.trim() || null : rapportEmail.trim() || null;
    const body = JSON.stringify({
      eindstaat_foto_urls: fotoUrls,
      video_url: videoUrl,
      handtekening_url: handtekeningUrl,
      opmerking: opmerking.trim() || null,
      rapport_email,
      controle:
        controleAkkoord === null ? [] : [{ punt: CONTROLE_PUNTEN[0], akkoord: controleAkkoord }],
    });
    // Achter de vorige save aanhaken, zodat saves in volgorde de server bereiken (geen overschrijving).
    opslaanChainRef.current = opslaanChainRef.current
      .catch(() => {})
      .then(() =>
        fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        }).catch(() => {}),
      );
  }

  // Foto's/video/handtekening meteen bewaren als ze wijzigen (de dure uploads niet kwijtraken).
  useEffect(() => {
    bewaarConcept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoUrls, videoUrl, handtekeningUrl, controleAkkoord]);

  const check = controleerOplevering({
    fotoCount: fotoUrls.length,
    heeftVideo: videoUrl !== null,
  });

  async function versturen() {
    if (!rapportEmail.trim()) {
      setFout("Kies een ontvanger of typ een e-mailadres voor het rapport.");
      return;
    }
    if (check.waarschuwing && !window.confirm(check.waarschuwing)) return;

    setBezig(true);
    setFout("");
    try {
      // Eerst de lopende concept-saves afronden, zodat de definitieve opslag hieronder niet door een
      // nog onderweg zijnde tussenopslag overschreven wordt.
      await opslaanChainRef.current.catch(() => {});
      // De handtekening is bij "Klaar" al geüpload en in elke tussenopslag bewaard; hier alleen
      // nog expliciet meesturen voor de zekerheid.
      const conceptRes = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eindstaat_foto_urls: fotoUrls,
          video_url: videoUrl,
          handtekening_url: handtekeningUrl,
          opmerking: opmerking.trim() || null,
          rapport_email: rapportEmail.trim() || null,
          controle:
            controleAkkoord === null ? [] : [{ punt: CONTROLE_PUNTEN[0], akkoord: controleAkkoord }],
        }),
      });
      if (!conceptRes.ok) {
        const b = await conceptRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Opslaan mislukt (${conceptRes.status})`);
      }

      const verstuurRes = await fetch(`/api/opdrachten/${opdrachtId}/opleveren`, { method: "POST" });
      if (!verstuurRes.ok) {
        const b = await verstuurRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Versturen mislukt (${verstuurRes.status})`);
      }

      // Belonend "klaar"-moment, dan terug naar de opdracht.
      setKlaar(true);
      setTimeout(() => {
        router.push(`/opdracht/${opdrachtId}`);
        router.refresh();
      }, 1400);
    } catch (err) {
      setFout((err as Error).message);
      setBezig(false);
    }
  }

  if (klaar) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <CheckCircle2
          size={72}
          strokeWidth={2.5}
          className="animate-[ping_0.6s_ease-out_1] text-success"
          aria-hidden="true"
        />
        <CheckCircle2 size={72} strokeWidth={2.5} className="-mt-[84px] text-success" aria-hidden="true" />
        <p className="mt-2 font-mono text-2xl font-extrabold text-ink">Opgeleverd!</p>
        <p className="text-sm text-ink-muted">Het rapport is naar de zaak verstuurd.</p>
      </div>
    );
  }

  // Welke optie in de dropdown actief is: handmatig, een eigen adres, of een keukenzaak.
  const huidigAdres = adresboek.find((a) => a.email === rapportEmail);
  const keuzeWaarde = handmatig
    ? "__anders__"
    : huidigAdres
      ? `adr:${huidigAdres.id}`
      : KEUKENZAKEN.find((z) => z.email === rapportEmail)?.naam ?? "";

  return (
    <div className="flex flex-col gap-6">
      {/* Stap 1: eindresultaat */}
      <section>
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          1. Eindresultaat vastleggen
        </h2>
        <p className="mb-3 text-sm text-ink-muted">
          Maak foto&apos;s van de keuken, het blad en de apparatuur. Een korte video mag erbij.
        </p>
        <FotoMaken urls={fotoUrls} onChange={setFotoUrls} />
        <div className="mt-3">
          <VideoMaken url={videoUrl} onChange={setVideoUrl} />
        </div>
      </section>

      {/* Stap 2: controle samen met de klant + opmerking, net boven de handtekening */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          2. Controle bij oplevering
        </h2>
        <p className="mb-3 text-sm text-ink-muted">Loop dit samen met de klant na vóór de handtekening.</p>

        <div className="border border-line bg-surface p-3">
          <p className="mb-2 text-sm font-semibold text-ink">{CONTROLE_PUNTEN[0]}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setControleAkkoord(true)}
              aria-pressed={controleAkkoord === true}
              className={`inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 border-2 px-3 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent ${
                controleAkkoord === true
                  ? "border-success bg-success text-white"
                  : "border-success bg-white text-success hover:bg-success/10"
              }`}
            >
              <CheckCircle2 size={18} strokeWidth={2.5} aria-hidden="true" />
              Akkoord
            </button>
            <button
              type="button"
              onClick={() => setControleAkkoord(false)}
              aria-pressed={controleAkkoord === false}
              className={`inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 border-2 px-3 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent ${
                controleAkkoord === false
                  ? "border-urgent-rood bg-urgent-rood text-white"
                  : "border-urgent-rood bg-white text-urgent-rood hover:bg-urgent-rood/10"
              }`}
            >
              <AlertCircle size={18} strokeWidth={2.5} aria-hidden="true" />
              Niet akkoord
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm text-ink-muted">Toch iets te melden? Typ of spreek het hier in.</p>
          <textarea
            value={opmerking}
            onChange={(e) => setOpmerking(e.target.value)}
            onBlur={() => bewaarConcept()}
            rows={3}
            aria-label="Opmerking bij de oplevering"
            placeholder="Bijv. klant belt nog voor smetplinten, of een opmerking van de klant…"
            className="w-full rounded-none border border-line bg-white p-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
          />
          <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
            <Mic size={16} aria-hidden="true" />
            Of spreek het in:
          </div>
          <div className="mt-1">
            <SpraakOpname onTekst={(t) => setOpmerking((prev) => (prev ? `${prev} ${t}` : t))} />
          </div>
        </div>
      </section>

      {/* Stap 2: handtekening (overslaanbaar) */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          3. Handtekening (optioneel)
        </h2>
        {handtekeningBezig ? (
          <div className="rounded-none border border-line bg-surface px-3 py-3">
            <Voortgang label="Handtekening opslaan…" />
          </div>
        ) : !handtekeningUrl ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <PenLine size={20} strokeWidth={2.5} aria-hidden="true" />
            Klant laten tekenen
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-none border border-success bg-success/10 p-2">
            <CheckCircle2 size={18} strokeWidth={2.5} className="shrink-0 text-success" aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={handtekeningUrl}
              alt="Handtekening klant"
              className="h-10 w-20 shrink-0 border border-line bg-white object-contain"
            />
            <span className="text-sm font-semibold text-success">Gezet</span>
            <div className="ml-auto flex gap-1.5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex min-h-[36px] cursor-pointer items-center justify-center border border-ink px-2 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                Opnieuw
              </button>
              <button
                type="button"
                onClick={() => setHandtekeningUrl(null)}
                className="inline-flex min-h-[36px] cursor-pointer items-center justify-center border border-urgent-rood px-2 text-xs font-semibold text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary"
              >
                Wis
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Rapport naar */}
      <section className="border-t border-line pt-6">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-ink">Rapport naar</span>
          <select
            value={keuzeWaarde}
            onChange={(e) => {
              const v = e.target.value;
              setBewerkId(null);
              if (v === "__anders__") {
                setHandmatig(true);
                setRapportEmail("");
                bewaarConcept("");
                setBewaarAdres(false);
                setNieuwAdresNaam("");
              } else if (v === "") {
                setHandmatig(false);
                setRapportEmail("");
                bewaarConcept("");
              } else if (v.startsWith("adr:")) {
                const a = adresboek.find((x) => `adr:${x.id}` === v);
                const email = a?.email ?? "";
                setHandmatig(false);
                setRapportEmail(email);
                bewaarConcept(email);
              } else {
                const email = KEUKENZAKEN.find((z) => z.naam === v)?.email ?? "";
                setHandmatig(false);
                setRapportEmail(email);
                bewaarConcept(email);
              }
            }}
            className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
          >
            <option value="">Kies een ontvanger…</option>
            {adresboek.length > 0 && (
              <optgroup label="Mijn adressen">
                {adresboek.map((a) => (
                  <option key={a.id} value={`adr:${a.id}`}>
                    {a.naam}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Keukenzaken">
              {KEUKENZAKEN.map((z) => (
                <option key={z.naam} value={z.naam}>
                  {z.naam}
                </option>
              ))}
            </optgroup>
            <option value="__anders__">Anders (typ zelf)</option>
          </select>

          {/* Beheer van het gekozen opgeslagen adres: aanpassen of wissen. */}
          {huidigAdres && (
            <div className="mt-1">
              {bewerkId === huidigAdres.id ? (
                <div className="flex flex-col gap-2 border border-line bg-surface p-2">
                  <input
                    value={bewerkNaam}
                    onChange={(e) => setBewerkNaam(e.target.value)}
                    placeholder="Naam"
                    className="min-h-[44px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
                  />
                  <input
                    type="email"
                    inputMode="email"
                    value={bewerkEmail}
                    onChange={(e) => setBewerkEmail(e.target.value)}
                    placeholder="voorbeeld@gmail.com"
                    className="min-h-[44px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={bewaarBewerking}
                      disabled={adresBezig || !bewerkNaam.trim() || !bewerkEmail.includes("@")}
                      className="inline-flex min-h-[44px] flex-1 cursor-pointer items-center justify-center bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 disabled:opacity-50"
                    >
                      Opslaan
                    </button>
                    <button
                      type="button"
                      onClick={() => setBewerkId(null)}
                      className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-2 border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface"
                    >
                      Annuleer
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-ink-muted">{huidigAdres.email}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBewerkId(huidigAdres.id);
                      setBewerkNaam(huidigAdres.naam);
                      setBewerkEmail(huidigAdres.email);
                    }}
                    className="ml-auto cursor-pointer font-bold text-primary hover:underline"
                  >
                    Aanpassen
                  </button>
                  <button
                    type="button"
                    onClick={() => verwijderAdresUit(huidigAdres)}
                    disabled={adresBezig}
                    className="cursor-pointer font-bold text-urgent-rood hover:underline disabled:opacity-50"
                  >
                    Wissen
                  </button>
                </div>
              )}
            </div>
          )}

          {handmatig && (
            <div className="mt-1 flex flex-col gap-2">
              <input
                type="email"
                inputMode="email"
                value={rapportEmail}
                onChange={(e) => setRapportEmail(e.target.value)}
                onBlur={() => bewaarConcept()}
                placeholder="voorbeeld@gmail.com"
                className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-3 focus-visible:outline-primary"
              />
              {rapportEmail.trim().includes("@") && (
                <label className="flex items-center gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={bewaarAdres}
                    onChange={(e) => setBewaarAdres(e.target.checked)}
                  />
                  Dit adres bewaren voor later
                </label>
              )}
              {bewaarAdres && rapportEmail.trim().includes("@") && (
                <div className="flex gap-2">
                  <input
                    value={nieuwAdresNaam}
                    onChange={(e) => setNieuwAdresNaam(e.target.value)}
                    placeholder="Naam, bijv. Keukenstudio Voorschoten"
                    className="min-h-[44px] flex-1 rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
                  />
                  <button
                    type="button"
                    onClick={bewaarNieuwAdres}
                    disabled={adresBezig || !nieuwAdresNaam.trim()}
                    className="inline-flex min-h-[44px] cursor-pointer items-center justify-center border-2 border-ink bg-white px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface disabled:opacity-50"
                  >
                    Bewaar
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        {fout && (
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
            <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {fout}
          </p>
        )}
      </section>

      {/* Vaste onderbalk: voorvertonen + navigatie + versturen */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-line bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-2">
          {bezig ? (
            <Voortgang label="Rapport maken en versturen…" />
          ) : (
            <>
              <Link
                href={`/opdracht/${opdrachtId}/rapport`}
                className="inline-flex min-h-[46px] w-full items-center justify-center gap-2 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
              >
                <Eye size={18} strokeWidth={2.5} aria-hidden="true" />
                Rapport voorvertonen
              </Link>
              <div className="flex gap-3">
                <Link
                  href={`/opdracht/${opdrachtId}`}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
                >
                  <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                  Meldingen
                </Link>
                <button
                  type="button"
                  onClick={versturen}
                  disabled={!online}
                  className="relative inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
                >
                  {!online ? (
                    <>
                      <CloudOff size={18} strokeWidth={2.5} aria-hidden="true" />
                      Netwerk nodig
                    </>
                  ) : (
                    <>
                      <PackageCheck size={18} strokeWidth={2.5} aria-hidden="true" />
                      Versturen
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {modalOpen && (
        <HandtekeningModal
          onOpslaan={async (d) => {
            setModalOpen(false);
            setHandtekeningBezig(true);
            setFout("");
            try {
              const blob = dataUrlNaarBlob(d);
              const { url } = await uploadHandtekening(blob);
              setHandtekeningUrl(url);
            } catch (err) {
              setFout(`Handtekening opslaan mislukt: ${(err as Error).message}`);
            } finally {
              setHandtekeningBezig(false);
            }
          }}
          onSluiten={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
