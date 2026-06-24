"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, PackageCheck, PenLine, CheckCircle2, Mic, ChevronLeft, Eye, CloudOff, Lock, Send, Check, Users, Clock } from "lucide-react";
import { useOfflineState } from "@/lib/use-offline-state";
import { useOpleverUpload } from "@/lib/oplever-upload-status";
import { OpleverFotos } from "@/components/OpleverFotos";
import { ActieKaart } from "@/components/ActieKaart";
import { VideoMaken } from "@/components/VideoMaken";
import { HandtekeningModal } from "@/components/HandtekeningModal";
import { SpraakOpname } from "@/components/SpraakOpname";
import { Voortgang } from "@/components/Voortgang";
import { OntvangerKeuze } from "@/components/OntvangerKeuze";
import { controleerOplevering } from "@/lib/oplever-validatie";
import { dataUrlNaarBlob, uploadHandtekening } from "@/lib/handtekening";
import { useVerlaatWaarschuwing } from "@/lib/use-verlaat-waarschuwing";
import { KEUKENZAKEN } from "@/lib/keukenzaken";
import { CONTROLE_PUNTEN } from "@/lib/oplever-controle";
import { formatDatumKort } from "@/lib/datum";
import type { Adres, RapportVerzending } from "@/lib/db";

export function OpleverFlow({
  opdrachtId,
  klantEmailVoorstel = null,
  waarschuwKlantZicht = true,
  magKlantLeveren = true,
  verkort = false,
}: {
  opdrachtId: string;
  /** Klant-mailadres uit de PDF; voorinvulwaarde voor de klant-versie. Aanpasbaar. */
  klantEmailVoorstel?: string | null;
  /** Monteur-voorkeur: waarschuwen bij versturen naar de klant dat die alles ziet. */
  waarschuwKlantZicht?: boolean;
  /** Mag deze klus ook aan de klant opgeleverd worden? (opdrachtgever-instelling / eigen klus) */
  magKlantLeveren?: boolean;
  /** Snel afsluiten: uitgeklede oplevering (verkorte PDF, geen handtekening/voorvertoon, vervolg-optie). */
  verkort?: boolean;
}) {
  const router = useRouter();
  const { online } = useOfflineState();
  const { ietsBezig: uploadBezig } = useOpleverUpload();
  const [fotoUrls, setFotoUrls] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  // Versturen: eerst kiezen naar wie, dan pas het bijbehorende blok tonen (minder rommel).
  const [verstuurKeuze, setVerstuurKeuze] = useState<"klant" | "zaak" | null>(null);
  const [opmerking, setOpmerking] = useState("");
  // Interne notitie + media: alleen voor de opdrachtgever, komt nooit in de klant-versie van het rapport.
  const [internOpmerking, setInternOpmerking] = useState("");
  const [internFotoUrls, setInternFotoUrls] = useState<string[]>([]);
  const [internVideoUrl, setInternVideoUrl] = useState<string | null>(null);
  // Per klus: levert de monteur deze oplevering ook aan de klant? Onthult de klant-kant + het
  // "voor de opdrachtgever"-blok. Alleen beschikbaar als de klus het toestaat (magKlantLeveren).
  const [klantLeveringAan, setKlantLeveringAan] = useState(false);
  // Snel afsluiten (verkort): "er komt nog een vervolg" houdt de klus open + zet hem terug naar kantoor.
  const [vervolgNodig, setVervolgNodig] = useState(false);
  // Controlepunt dat de klant aftekent: true = akkoord, false = niet akkoord, null = nog niet gekozen.
  const [controleAkkoord, setControleAkkoord] = useState<boolean | null>(null);
  const [rapportEmail, setRapportEmail] = useState("");
  // Klant-versie: adres (voorinvuld uit de PDF) en of elke kant al verstuurd is.
  const [klantEmail, setKlantEmail] = useState("");
  const [klantVerzondenAt, setKlantVerzondenAt] = useState<string | null>(null);
  const [zaakVerzondenAt, setZaakVerzondenAt] = useState<string | null>(null);
  // Append-only verzendgeschiedenis: wat is wanneer naar welk adres gestuurd.
  const [verzendingen, setVerzendingen] = useState<RapportVerzending[]>([]);
  const [klantBezig, setKlantBezig] = useState(false);
  const [zaakBezig, setZaakBezig] = useState(false);
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
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");

  useVerlaatWaarschuwing(uploadBezig || klantBezig || zaakBezig);

  // Een verwijderde/vervangen foto of video ook uit storage opruimen (geen weesbestand). Best-effort:
  // de server weigert netjes als er al een rapport verstuurd is (dan blijft het bestand bewaard).
  function ruimOpleverBestandOp(url: string) {
    void fetch(`/api/opdrachten/${opdrachtId}/oplever-bestand`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {});
  }

  // Bevestiging vóór in-app weg-navigeren terwijl er nog een upload loopt. De al klaar-geüploade foto's
  // staan veilig in het concept; alleen de lopende upload stopt. Geeft de monteur de keuze.
  function bevestigVerlaten(): boolean {
    if (!uploadBezig) return true;
    return window.confirm(
      "Er wordt nog iets geüpload. Wat al klaar is blijft bewaard, maar de lopende upload stopt als je weggaat. Toch doorgaan?",
    );
  }

  const geladenRef = useRef(false);
  // Heeft de monteur al iets gewijzigd vóórdat het concept geladen was? Dan mag de (latere) load zijn
  // verse invoer niet overschrijven, en moet de overgeslagen opslag alsnog gebeuren (zie load-effect).
  const vuilRef = useRef(false);
  const [flushNaLoad, setFlushNaLoad] = useState(0);
  // Concept-saves serialiseren: elke opslag wacht op de vorige. Zonder dit zijn de saves
  // fire-and-forget en kan een eerdere (met verouderde state, bv. nog lege opmerking) een latere
  // overschrijven door out-of-order aankomst bij de server. Nu wint altijd de laatst getriggerde.
  const opslaanChainRef = useRef<Promise<unknown>>(Promise.resolve());

  // Bestaand concept laden bij binnenkomst, zodat een halve oplevering (incl. de geuploade
  // video) bewaard blijft als je tussendoor naar de kluspool gaat en terugkomt.
  useEffect(() => {
    let actief = true;
    (async () => {
      try {
        const res = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`);
        if (res.ok && actief) {
          const { oplevering, verzendingen: vz } = await res.json();
          setVerzendingen(Array.isArray(vz) ? vz : []);
          // Was de monteur sneller dan de load (vuilRef), dan zijn verse invoer NIET overschrijven met
          // de serverstand; de overgeslagen opslag wordt na de load alsnog geflusht (finally).
          if (vuilRef.current) {
            // niets toepassen
          } else if (oplevering) {
            setFotoUrls(oplevering.eindstaat_foto_urls ?? []);
            setVideoUrl(oplevering.video_url ?? null);
            setHandtekeningUrl(oplevering.handtekening_url ?? null);
            setOpmerking(oplevering.opmerking ?? "");
            setInternOpmerking(oplevering.interne_opmerking ?? "");
            setInternFotoUrls(oplevering.interne_foto_urls ?? []);
            setInternVideoUrl(oplevering.interne_video_url ?? null);
            // Klant-kant heropenen als er al klant-gerichte inhoud of een klant-verzending is.
            const heeftKlantKant =
              !!oplevering.interne_opmerking?.trim() ||
              (oplevering.interne_foto_urls?.length ?? 0) > 0 ||
              !!oplevering.interne_video_url ||
              !!oplevering.klant_rapport_verzonden_at;
            if (magKlantLeveren && heeftKlantKant) setKlantLeveringAan(true);
            const c = Array.isArray(oplevering.controle) ? oplevering.controle : [];
            setControleAkkoord(c.length > 0 ? Boolean(c[0].akkoord) : null);
            const em: string = oplevering.rapport_email ?? "";
            setRapportEmail(em);
            if (em && !KEUKENZAKEN.some((z) => z.email === em)) setHandmatig(true);
            // Klant-adres: het bewaarde adres, anders het voorstel uit de PDF.
            setKlantEmail(oplevering.klant_rapport_email ?? klantEmailVoorstel ?? "");
            setKlantVerzondenAt(oplevering.klant_rapport_verzonden_at ?? null);
            setZaakVerzondenAt(oplevering.zaak_rapport_verzonden_at ?? null);
          } else {
            // Nog geen concept: vul het klant-adres alvast met het voorstel uit de PDF.
            setKlantEmail(klantEmailVoorstel ?? "");
          }
        }
      } finally {
        geladenRef.current = true;
        // Heeft de monteur al iets gewijzigd terwijl de load liep, dan die overgeslagen opslag nu alsnog
        // uitvoeren (flush-effect hieronder draait met verse state).
        if (actief && vuilRef.current) setFlushNaLoad((n) => n + 1);
      }
    })();
    return () => {
      actief = false;
    };
  }, [opdrachtId, klantEmailVoorstel, magKlantLeveren]);

  // Flush van de opslag die werd overgeslagen omdat het concept nog niet geladen was.
  useEffect(() => {
    if (flushNaLoad > 0) bewaarConcept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flushNaLoad]);

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
    // Vóórdat het concept geladen is niet opslaan (zou een bestaand concept met lege mount-state kunnen
    // overschrijven), maar wél onthouden dat er iets te bewaren is, zodat het na de load alsnog gebeurt.
    if (!geladenRef.current) {
      vuilRef.current = true;
      return;
    }
    const rapport_email =
      emailOverride !== undefined ? emailOverride.trim() || null : rapportEmail.trim() || null;
    const body = JSON.stringify({
      eindstaat_foto_urls: fotoUrls,
      video_url: videoUrl,
      handtekening_url: handtekeningUrl,
      opmerking: opmerking.trim() || null,
      interne_opmerking: internOpmerking.trim() || null,
      interne_foto_urls: internFotoUrls,
      interne_video_url: internVideoUrl,
      rapport_email,
      klant_rapport_email: klantEmail.trim() || null,
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
  // De allereerste run is de mount met lege state; die overslaan, anders zou hij de laad-gate als
  // "gewijzigd" markeren en het laden van een bestaand (heropend) concept saboteren.
  const opslagEffectGestart = useRef(false);
  useEffect(() => {
    if (!opslagEffectGestart.current) {
      opslagEffectGestart.current = true;
      return;
    }
    bewaarConcept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fotoUrls, videoUrl, handtekeningUrl, controleAkkoord, internFotoUrls, internVideoUrl]);

  const check = controleerOplevering({
    fotoCount: fotoUrls.length,
    heeftVideo: videoUrl !== null,
  });

  /**
   * Verstuurt het rapport naar één doelgroep, los in tijd.
   * - "klant": schone versie; de monteur blijft op het scherm (kan daarna nog naar de zaak).
   * - "zaak": volledige versie; dit is het afrond-moment (opdracht wordt opgeleverd).
   */
  async function verstuurNaar(doelgroep: "klant" | "zaak") {
    if (doelgroep === "klant" && !klantEmail.trim()) {
      setFout("Vul een e-mailadres van de klant in.");
      return;
    }
    if (doelgroep === "zaak" && !rapportEmail.trim()) {
      setFout("Kies een ontvanger voor de opdrachtgever.");
      return;
    }
    // Privacy-waarschuwing: de klant ziet ALLE foto's en meldingen, niet alleen de opmerking. Wil de
    // monteur iets alleen voor de zaak kwijt, dan is daar de interne notitie voor. Aan/uit in Mijn gegevens.
    if (
      doelgroep === "klant" &&
      waarschuwKlantZicht &&
      !window.confirm(
        "Let op: de klant ziet alle foto's en meldingen in dit rapport, niet alleen je opmerking. " +
          "Wil je iets alleen voor de opdrachtgever kwijt, gebruik dan de interne notitie.\n\nToch naar de klant sturen?",
      )
    ) {
      return;
    }
    if (check.waarschuwing && !window.confirm(check.waarschuwing)) return;

    const zetBezig = doelgroep === "klant" ? setKlantBezig : setZaakBezig;
    zetBezig(true);
    setFout("");
    try {
      // Eerst de lopende concept-saves afronden, en daarna nog één expliciete opslag, zodat de
      // verzending werkt met de laatste stand (adres, interne notitie, controle).
      await opslaanChainRef.current.catch(() => {});
      const conceptRes = await fetch(`/api/opdrachten/${opdrachtId}/oplevering`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eindstaat_foto_urls: fotoUrls,
          video_url: videoUrl,
          handtekening_url: handtekeningUrl,
          opmerking: opmerking.trim() || null,
          interne_opmerking: internOpmerking.trim() || null,
          interne_foto_urls: internFotoUrls,
          interne_video_url: internVideoUrl,
          rapport_email: rapportEmail.trim() || null,
          klant_rapport_email: klantEmail.trim() || null,
          controle:
            controleAkkoord === null ? [] : [{ punt: CONTROLE_PUNTEN[0], akkoord: controleAkkoord }],
        }),
      });
      if (!conceptRes.ok) {
        const b = await conceptRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Opslaan mislukt (${conceptRes.status})`);
      }

      const verstuurRes = await fetch(`/api/opdrachten/${opdrachtId}/rapport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doelgroep,
          variant: verkort ? "verkorting" : "volledig",
          vervolg: verkort && doelgroep === "zaak" && vervolgNodig,
        }),
      });
      if (!verstuurRes.ok) {
        const b = await verstuurRes.json().catch(() => ({}));
        throw new Error(b.error ?? `Versturen mislukt (${verstuurRes.status})`);
      }

      const nu = new Date().toISOString();
      // Direct in de zichtbare geschiedenis bijwerken (server heeft de regel ook vastgelegd).
      setVerzendingen((prev) => [
        {
          id: nu,
          created_at: nu,
          opdracht_id: opdrachtId,
          doelgroep,
          naar: (doelgroep === "klant" ? klantEmail : rapportEmail).trim(),
          rapport_url: null,
          door_id: null,
        },
        ...prev,
      ]);
      if (doelgroep === "klant") {
        // Klant gehad: status flipt, monteur blijft (kan nu of later naar de zaak).
        setKlantVerzondenAt(nu);
        setKlantBezig(false);
      } else {
        // Zaak gehad: de klus is opgeleverd. Belonend "klaar"-moment, dan terug naar de opdracht.
        setZaakVerzondenAt(nu);
        setKlaar(true);
        setTimeout(() => {
          router.push(`/opdracht/${opdrachtId}`);
          router.refresh();
        }, 1400);
      }
    } catch (err) {
      setFout((err as Error).message);
      zetBezig(false);
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
        <p className="mt-2 font-mono text-2xl font-extrabold text-ink">
          {verkort && vervolgNodig ? "Doorgegeven!" : "Opgeleverd!"}
        </p>
        <p className="text-sm text-ink-muted">
          {verkort && vervolgNodig
            ? "De opdrachtgever heeft het rapport. De klus staat klaar voor een vervolg."
            : "Het rapport is naar de opdrachtgever verstuurd."}
        </p>
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
        <OpleverFotos
          urls={fotoUrls}
          onFotoKlaar={(url) => setFotoUrls((prev) => [...prev, url])}
          onFotoVerwijder={(url) => {
            setFotoUrls((prev) => prev.filter((u) => u !== url));
            ruimOpleverBestandOp(url);
          }}
        />
        <div className="mt-3">
          <VideoMaken
            url={videoUrl}
            onChange={(nieuwe) => {
              const oud = videoUrl;
              setVideoUrl(nieuwe);
              // Bij verwijderen (nieuwe = null) of vervangen de oude video opruimen.
              if (oud && oud !== nieuwe) ruimOpleverBestandOp(oud);
            }}
          />
        </div>
      </section>

      {/* Stap 2: controle samen met de klant + opmerking, net boven de handtekening */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          2. Opmerking en klant
        </h2>
        <p className="mb-3 text-sm text-ink-muted">Een opmerking voor in het rapport, en of de klant het ook krijgt.</p>

        {/* Ook aan de klant opleveren: alleen als de opdrachtgever/klus het toestaat. Onthult de
            klant-kant (het "voor de opdrachtgever"-blok hieronder + de klant-verzendkaart). */}
        {magKlantLeveren && (
          <button
            type="button"
            onClick={() => setKlantLeveringAan((v) => !v)}
            aria-pressed={klantLeveringAan}
            className="flex w-full items-stretch border-2 border-line bg-white text-left hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <span aria-hidden className={`w-1.5 shrink-0 ${klantLeveringAan ? "bg-accent" : "bg-ink-muted"}`} />
            <span className="flex flex-1 items-center gap-3 px-3 py-2.5">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  klantLeveringAan ? "bg-accent/15 text-accent" : "bg-ink-muted/10 text-ink-muted"
                }`}
              >
                <Users size={22} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-mono text-base font-extrabold text-ink">Ook aan de klant opleveren</span>
                <span className="mt-0.5 block text-sm text-ink-muted">
                  {klantLeveringAan ? "De klant krijgt de oplevering ook." : "Klant krijgt geen eigen versie."}
                </span>
              </span>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center border-2 border-primary ${
                  klantLeveringAan ? "bg-primary text-white" : "bg-white text-transparent"
                }`}
              >
                <Check size={16} strokeWidth={3} aria-hidden="true" />
              </span>
            </span>
          </button>
        )}

        <div className="mt-4">
          <p className="mb-1 text-sm font-semibold text-ink">
            Opmerking{" "}
            <span className="font-normal text-ink-muted">
              · {klantLeveringAan ? "dit ziet ook de klant" : "voor de opdrachtgever"}
            </span>
          </p>
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

        {/* Voor de opdrachtgever: foto/video/tekst die de klant NIET ziet. Alleen als klant-levering aan
            staat (anders gaat sowieso alles naar de opdrachtgever en is de splitsing zinloos). Hergebruikt
            exact dezelfde upload-componenten als de oplevering (met hun voortgang). */}
        {klantLeveringAan && (
          <div className="mt-4 border-2 border-urgent-geel bg-urgent-geel/10 p-3">
            <div className="flex items-center gap-2">
              <Lock size={18} strokeWidth={2.4} className="shrink-0 text-ink" aria-hidden="true" />
              <span className="text-sm font-semibold leading-tight text-ink">
                Voor de opdrachtgever
                <span className="block text-xs font-bold uppercase tracking-[0.04em] text-ink-muted">
                  Klant ziet dit niet
                </span>
              </span>
            </div>
            <div className="mt-3">
              <OpleverFotos
                urls={internFotoUrls}
                onFotoKlaar={(url) => setInternFotoUrls((prev) => [...prev, url])}
                onFotoVerwijder={(url) => {
                  setInternFotoUrls((prev) => prev.filter((u) => u !== url));
                  ruimOpleverBestandOp(url);
                }}
              />
            </div>
            <div className="mt-3">
              <VideoMaken
                url={internVideoUrl}
                onChange={(nieuwe) => {
                  const oud = internVideoUrl;
                  setInternVideoUrl(nieuwe);
                  if (oud && oud !== nieuwe) ruimOpleverBestandOp(oud);
                }}
              />
            </div>
            <textarea
              value={internOpmerking}
              onChange={(e) => setInternOpmerking(e.target.value)}
              onBlur={() => bewaarConcept()}
              rows={3}
              aria-label="Notitie voor de opdrachtgever"
              placeholder="Bijv. transportschade aan kastdeur, in het werk opgelost."
              className="mt-3 w-full rounded-none border border-urgent-geel bg-white p-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
            />
            <div className="mt-2 flex items-center gap-2 text-sm text-ink-muted">
              <Mic size={16} aria-hidden="true" />
              Of spreek het in:
            </div>
            <div className="mt-1">
              <SpraakOpname onTekst={(t) => setInternOpmerking((prev) => (prev ? `${prev} ${t}` : t))} />
            </div>
          </div>
        )}

        <div className="mt-4 border border-line bg-surface p-3">
          <p className="mb-2 text-sm font-semibold text-ink">{CONTROLE_PUNTEN[0]}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setControleAkkoord(true)}
              aria-pressed={controleAkkoord === true}
              className={`inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border-2 px-3 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent ${
                controleAkkoord === true
                  ? "border-success bg-success text-white"
                  : "border-success bg-white text-success hover:bg-success/10"
              }`}
            >
              <CheckCircle2 size={18} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
              Akkoord
            </button>
            <button
              type="button"
              onClick={() => setControleAkkoord(false)}
              aria-pressed={controleAkkoord === false}
              className={`inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap border-2 px-3 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent ${
                controleAkkoord === false
                  ? "border-urgent-rood bg-urgent-rood text-white"
                  : "border-urgent-rood bg-white text-urgent-rood hover:bg-urgent-rood/10"
              }`}
            >
              <AlertCircle size={18} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
              Niet akkoord
            </button>
          </div>
        </div>
      </section>

      {/* Handtekening (overslaanbaar) — niet bij snel afsluiten (verkort). */}
      {!verkort && (
      <section className="border-t border-line pt-6">
        <h2 className="mb-2 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          3. Handtekening (optioneel)
        </h2>
        {handtekeningBezig ? (
          <div className="rounded-none border border-line bg-surface px-3 py-3">
            <Voortgang label="Handtekening opslaan…" />
          </div>
        ) : !handtekeningUrl ? (
          <ActieKaart
            accent="neutraal"
            icoon={<PenLine size={22} strokeWidth={2.5} aria-hidden="true" />}
            titel="Klant laten tekenen"
            sub="Optioneel"
            onClick={() => {
              // De klant tekent voor de oplevering; leg eerst de controle-uitkomst vast. Zacht: niet blokkeren.
              if (
                controleAkkoord === null &&
                !window.confirm(
                  "Je hebt 'akkoord' of 'niet akkoord' nog niet aangevinkt. De klant tekent voor de oplevering. Toch laten tekenen?",
                )
              ) {
                return;
              }
              setModalOpen(true);
            }}
          />
        ) : (
          <div className="flex items-stretch border-2 border-line bg-white">
            <span aria-hidden className="w-1.5 shrink-0 bg-success" />
            <div className="flex flex-1 items-center gap-3 px-3 py-2.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <Check size={22} strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="flex-1 font-mono text-base font-extrabold text-ink">Handtekening gezet</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={handtekeningUrl}
                alt="Handtekening klant"
                className="h-9 w-[70px] shrink-0 border border-line bg-white object-contain"
              />
              <div className="flex shrink-0 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex min-h-[32px] cursor-pointer items-center justify-center border border-ink px-2 text-xs font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
                >
                  Opnieuw
                </button>
                <button
                  type="button"
                  onClick={() => setHandtekeningUrl(null)}
                  className="inline-flex min-h-[32px] cursor-pointer items-center justify-center border border-urgent-rood px-2 text-xs font-semibold text-urgent-rood hover:bg-urgent-rood/10 focus-visible:outline-3 focus-visible:outline-primary"
                >
                  Wis
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      )}

      {/* Snel afsluiten: er komt nog een vervolg (houdt de klus open + terug naar kantoor). */}
      {verkort && (
        <section className="border-t border-line pt-6">
          <label className="flex items-start gap-3 border-2 border-urgent-geel bg-[#fffbeb] p-3 text-sm">
            <input
              type="checkbox"
              checked={vervolgNodig}
              onChange={(e) => setVervolgNodig(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 accent-ink"
            />
            <span>
              <span className="font-bold text-ink">Er komt nog een vervolg</span>
              <span className="block text-ink-muted">
                De opdrachtgever krijgt het rapport, maar de klus blijft open en gaat terug naar kantoor om opnieuw in te plannen.
              </span>
            </span>
          </label>
        </section>
      )}

      {/* Rapport voorvertonen — niet bij snel afsluiten (verkort). */}
      {!verkort && (
      <section className="border-t border-line pt-6">
        <ActieKaart
          href={`/opdracht/${opdrachtId}/rapport`}
          accent="neutraal"
          icoon={<Eye size={22} strokeWidth={2.5} aria-hidden="true" />}
          titel="Rapport voorvertonen"
          sub="Bekijk hoe het rapport eruitziet"
          onClick={(e) => {
            if (!bevestigVerlaten()) e.preventDefault();
          }}
        />
      </section>
      )}

      {/* 4. Versturen: twee losse kaarten (klant / zaak), los in tijd. */}
      <section className="border-t border-line pt-6">
        <h2 className="mb-3 font-mono text-base font-extrabold uppercase tracking-[0.06em] text-ink">
          4. Versturen
        </h2>

        {verstuurKeuze === null && (
          <div className="flex flex-col gap-2">
            <ActieKaart
              accent={zaakVerzondenAt ? "klaar" : "actie"}
              subAccent
              icoon={
                zaakVerzondenAt ? (
                  <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <Send size={20} strokeWidth={2.5} aria-hidden="true" />
                )
              }
              titel="Naar de opdrachtgever"
              sub={zaakVerzondenAt ? `Verzonden · ${formatDatumKort(zaakVerzondenAt)}` : "Nog te versturen"}
              onClick={() => setVerstuurKeuze("zaak")}
            />
            {klantLeveringAan && (
              <ActieKaart
                accent={klantVerzondenAt ? "klaar" : "actie"}
                subAccent
                icoon={
                  klantVerzondenAt ? (
                    <CheckCircle2 size={22} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <Send size={20} strokeWidth={2.5} aria-hidden="true" />
                  )
                }
                titel="Naar de klant"
                sub={klantVerzondenAt ? `Verzonden · ${formatDatumKort(klantVerzondenAt)}` : "Nog te versturen"}
                onClick={() => setVerstuurKeuze("klant")}
              />
            )}
            <ActieKaart
              accent="neutraal"
              icoon={<Clock size={22} strokeWidth={2.5} aria-hidden="true" />}
              titel="Later versturen"
              sub="Zet klaar in je kluspool"
              onClick={() => {
                if (!bevestigVerlaten()) return;
                router.push(`/opdracht/${opdrachtId}`);
                router.refresh();
              }}
            />
          </div>
        )}

        {/* Naar de klant: schone versie (zonder interne notitie). Optioneel, meestal meteen. */}
        {verstuurKeuze === "klant" && (
          <>
            <button
              type="button"
              onClick={() => setVerstuurKeuze(null)}
              className="mb-2 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <ChevronLeft size={16} strokeWidth={2.5} aria-hidden="true" />
              Andere ontvanger
            </button>
        <div className="border-2 border-line">
          <div className="border-b border-line bg-surface px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
            Naar de klant
          </div>
          <div className="flex flex-col gap-2 p-3">
            <input
              type="email"
              inputMode="email"
              value={klantEmail}
              onChange={(e) => setKlantEmail(e.target.value)}
              onBlur={() => bewaarConcept()}
              aria-label="E-mailadres van de klant"
              placeholder="E-mailadres van de klant"
              className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink placeholder:text-ink-muted focus-visible:outline-3 focus-visible:outline-primary"
            />
            <button
              type="button"
              onClick={() => verstuurNaar("klant")}
              disabled={!online || klantBezig || !klantEmail.trim()}
              className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60"
            >
              {klantBezig ? "Versturen…" : !online ? "Netwerk nodig" : "Stuur naar klant"}
            </button>
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${klantVerzondenAt ? "text-success" : "text-ink-muted"}`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${klantVerzondenAt ? "border-success bg-success" : "border-ink-muted"}`}
              />
              {klantVerzondenAt ? "Verzonden" : "nog niet verzonden"}
            </div>
          </div>
        </div>
          </>
        )}

        {/* Naar de zaak: volledige versie (mét interne notitie). Dit is het afrond-moment. */}
        {verstuurKeuze === "zaak" && (
          <>
            <button
              type="button"
              onClick={() => setVerstuurKeuze(null)}
              className="mb-2 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 text-sm font-bold text-primary hover:underline"
            >
              <ChevronLeft size={16} strokeWidth={2.5} aria-hidden="true" />
              Andere ontvanger
            </button>
        <div className="mt-3 border-2 border-line">
          <div className="border-b border-line bg-surface px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
            Naar de opdrachtgever
          </div>
          <div className="flex flex-col gap-2 p-3">
            {klantVerzondenAt && (
              <p className="flex items-start gap-1.5 border border-success bg-success/10 p-2 text-sm font-semibold text-success">
                <CheckCircle2 size={16} strokeWidth={2.4} className="mt-0.5 shrink-0" aria-hidden="true" />
                Klant heeft het rapport ook ontvangen.
              </p>
            )}
            <span className="text-sm font-semibold text-ink">Rapport naar</span>
          <OntvangerKeuze
            value={keuzeWaarde}
            adresboek={adresboek}
            onKies={(v) => {
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
          />

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
                  <span className="min-w-0 flex-1 truncate text-ink-muted" title={huidigAdres.email}>
                    {huidigAdres.email}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setBewerkId(huidigAdres.id);
                      setBewerkNaam(huidigAdres.naam);
                      setBewerkEmail(huidigAdres.email);
                    }}
                    className="shrink-0 cursor-pointer font-bold text-primary hover:underline"
                  >
                    Aanpassen
                  </button>
                  <button
                    type="button"
                    onClick={() => verwijderAdresUit(huidigAdres)}
                    disabled={adresBezig}
                    className="shrink-0 cursor-pointer font-bold text-urgent-rood hover:underline disabled:opacity-50"
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
                aria-label="E-mailadres voor het rapport"
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
            <button
              type="button"
              onClick={() => verstuurNaar("zaak")}
              disabled={!online || zaakBezig || !rapportEmail.trim()}
              className="relative inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-1.5 bg-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
            >
              {zaakBezig ? (
                "Versturen…"
              ) : !online ? (
                <>
                  <CloudOff size={18} strokeWidth={2.5} aria-hidden="true" />
                  Netwerk nodig
                </>
              ) : (
                <>
                  <PackageCheck size={18} strokeWidth={2.5} aria-hidden="true" />
                  Stuur naar opdrachtgever
                </>
              )}
            </button>
            <div
              className={`flex items-center gap-2 text-sm font-semibold ${zaakVerzondenAt ? "text-success" : "text-ink-muted"}`}
            >
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 ${zaakVerzondenAt ? "border-success bg-success" : "border-ink-muted"}`}
              />
              {zaakVerzondenAt ? "Verzonden" : "nog niet verzonden"}
            </div>
          </div>
        </div>
          </>
        )}

        {/* Verzendgeschiedenis: append-only, zodat terug te zien is wat wanneer waarheen ging. */}
        {verzendingen.length > 0 && (
          <div className="mt-3 border border-line bg-surface p-3">
            <p className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.1em] text-ink-muted">
              Verzendgeschiedenis
            </p>
            <ul className="flex flex-col gap-1.5">
              {verzendingen.map((v) => (
                <li key={v.id} className="flex items-start gap-2 text-sm text-ink">
                  <span
                    className={`mt-0.5 shrink-0 border px-1.5 text-xs font-bold uppercase tracking-[0.03em] ${
                      v.doelgroep === "zaak" ? "border-primary text-primary" : "border-ink-muted text-ink-muted"
                    }`}
                  >
                    {v.doelgroep}
                  </span>
                  <span className="min-w-0 flex-1 break-all">{v.naar}</span>
                  <span className="shrink-0 text-xs text-ink-muted">{formatDatumKort(v.created_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {fout && (
          <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
            <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
            {fout}
          </p>
        )}
      </section>

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
