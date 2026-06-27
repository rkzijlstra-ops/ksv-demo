"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Loader2,
  Check,
  AlertCircle,
  X,
  CloudOff,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Camera,
} from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";
import { useOfflineState } from "@/lib/use-offline-state";
import { HydratieKlaar } from "@/components/HydratieKlaar";
import { SpraakOpname } from "@/components/SpraakOpname";
import { AdresKeuze } from "@/components/AdresKeuze";
import { adresKeuzeNodig, uniekeAdressen } from "@/lib/adres-keuze";
import { KLUS_VELD } from "@/lib/klus-velden";
import { uploadDocumenten, type GeUploadDocument } from "@/lib/document-upload";
import type { ParsedPdf, AdresKandidaat } from "@/lib/parser-schema";

type Status = "idle" | "parsing" | "saving" | "success" | "error";

interface KlusGroep {
  velden: ParsedPdf;
  bestanden: GeUploadDocument[];
}

const veldKlasse =
  "min-h-[48px] w-full rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";
const labelKlasse = "flex flex-col gap-1 text-sm font-semibold text-ink";

function groepLabel(velden: ParsedPdf, i: number): string {
  const delen = [velden.referentienummer, velden.klant_naam].filter(Boolean);
  return delen.length ? delen.join(" - ") : `Klus ${i + 1}`;
}

/**
 * Eén gedeeld component om een klus in te voeren. Bestanden gaan rechtstreeks naar de opslag (geen 413),
 * worden samen ingelezen en per klus gegroepeerd. Zit er één klus in, dan vult de app de velden voor;
 * zitten er meerdere in (per ongeluk twee orders samen), dan toont de app de groepen en wijst de invoerder
 * elk bestand toe.
 */
export function KlusInvoer({ context = "monteur" }: { context?: "monteur" | "kantoor" }) {
  const kantoor = context === "kantoor";
  const router = useRouter();
  const { online } = useOfflineState();
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const bezigRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [parseInfo, setParseInfo] = useState("");

  // Alle reeds-geüploade documenten (opslagverwijzingen) van deze invoer.
  const [geupload, setGeupload] = useState<GeUploadDocument[]>([]);

  // Upload-voortgang (zoals bij de oplever-video): hoeveel bestanden van het totaal al geüpload zijn.
  const [uploadVoortgang, setUploadVoortgang] = useState<{ gedaan: number; totaal: number } | null>(null);

  // Meer-klussen-modus: gevonden groepen + per bestand (op pad) de gekozen groep-index (-1 = niet aanmaken).
  const [groepen, setGroepen] = useState<KlusGroep[] | null>(null);
  const [toewijzing, setToewijzing] = useState<Record<string, number>>({});
  // Per groep (index) de zelf in te vullen datum/tijd/omschrijving voor het aanmaken.
  const [groepExtra, setGroepExtra] = useState<Record<number, { datum?: string; tijd?: string; werk?: string }>>({});

  // Adres-keuze (alleen in één-klus-modus).
  const [adresKandidaten, setAdresKandidaten] = useState<AdresKandidaat[]>([]);

  const [naam, setNaam] = useState("");
  const [adres, setAdres] = useState("");
  const [ref, setRef] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [email, setEmail] = useState("");
  const [keukenzaak, setKeukenzaak] = useState("");
  const [werkomschrijving, setWerkomschrijving] = useState("");
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("");
  const [documenttype, setDocumenttype] = useState<ParsedPdf["documenttype"] | "">("");
  const [leverweek, setLeverweek] = useState("");
  const [adviseur, setAdviseur] = useState("");
  const [meldingenJson, setMeldingenJson] = useState("");

  const parsing = status === "parsing";
  const saving = status === "saving";

  function reset() {
    setGeupload([]);
    setUploadVoortgang(null);
    setGroepen(null);
    setToewijzing({});
    setGroepExtra({});
    setAdresKandidaten([]);
    setNaam("");
    setAdres("");
    setRef("");
    setTelefoon("");
    setEmail("");
    setKeukenzaak("");
    setWerkomschrijving("");
    setDatum("");
    setTijd("");
    setDocumenttype("");
    setLeverweek("");
    setAdviseur("");
    setMeldingenJson("");
    setParseInfo("");
    if (inputRef.current) inputRef.current.value = "";
  }

  // Lege velden vullen met wat de parser vond; wat de gebruiker al typte laten we staan.
  function vulUitParse(p: ParsedPdf | null) {
    if (!p) {
      setParseInfo("Kon het document niet automatisch lezen. Vul de gegevens hieronder zelf in.");
      return;
    }
    setNaam((v) => v || p.klant_naam || "");
    setRef((v) => v || p.referentienummer || "");
    setTelefoon((v) => v || p.klant_telefoon || "");
    setEmail((v) => v || p.klant_email || "");
    setKeukenzaak((v) => v || p.keukenzaak || "");
    setDocumenttype(p.documenttype || "");
    setLeverweek(p.leverweek || "");
    setAdviseur(p.adviseur || "");
    setMeldingenJson(Array.isArray(p.meldingen) && p.meldingen.length ? JSON.stringify(p.meldingen) : "");
    const adressen = Array.isArray(p.adressen) ? p.adressen : [];
    if (adresKeuzeNodig(adressen)) {
      setAdresKandidaten(uniekeAdressen(adressen));
      setParseInfo(
        "Gegevens gelezen. Let op: er staan meerdere adressen op de order. Kies hieronder de montagelocatie.",
      );
    } else {
      setAdresKandidaten([]);
      setAdres((v) => v || p.klant_adres || "");
      setParseInfo("Gegevens uit het document gelezen. Controleer en vul aan wat je weet.");
    }
  }

  /** Uploadt de nieuwe bestanden en leest de hele set opnieuw in (groepering bijwerken). */
  async function uploadEnLees(nieuweFiles: File[]) {
    setStatus("parsing");
    setMessage("");
    setParseInfo("");
    setUploadVoortgang({ gedaan: 0, totaal: nieuweFiles.length });
    try {
      const nieuwGeupload = await uploadDocumenten(nieuweFiles, (gedaan, totaal) =>
        setUploadVoortgang({ gedaan, totaal }),
      );
      setUploadVoortgang(null);
      const alle = [...geupload, ...nieuwGeupload];
      setGeupload(alle);

      const res = await fetch("/api/opdrachten/inlezen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paden: alle.map((d) => ({ naam: d.naam, type: d.type, pad: d.pad })) }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setParseInfo(body.error ?? "Kon de documenten niet inlezen. Vul de gegevens zelf in.");
        return;
      }
      const gevonden = (body.groepen ?? []) as KlusGroep[];
      const fout = (body.foutPerDocument ?? []).find((f: string | null) => f) as string | undefined;

      if (gevonden.length >= 2) {
        // Meer-klussen-modus: koppel server-bestanden (op pad) terug aan onze upload-objecten.
        const padNaarGroep: Record<string, number> = {};
        gevonden.forEach((g, gi) => g.bestanden.forEach((b) => (padNaarGroep[b.pad] = gi)));
        const tw: Record<string, number> = {};
        for (const d of alle) tw[d.pad] = padNaarGroep[d.pad] ?? -1;
        setGroepen(gevonden);
        setToewijzing(tw);
        setParseInfo(
          `Er lijken ${gevonden.length} klussen in te zitten. Controleer de indeling en pas aan waar nodig.`,
        );
      } else {
        setGroepen(null);
        vulUitParse(gevonden[0]?.velden ?? null);
        if (!gevonden.length && fout) setParseInfo(`Inlezen mislukt: ${fout}. Vul de gegevens zelf in.`);
      }
    } catch (e) {
      setParseInfo(`Kon de documenten niet verwerken: ${(e as Error).message}`);
    } finally {
      setStatus("idle");
      setUploadVoortgang(null);
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const gekozen = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (gekozen.length === 0) return;
    void uploadEnLees(gekozen);
  }

  function sluit() {
    reset();
    setOpen(false);
    setStatus("idle");
  }

  function veldenUitFormulier(): KlusGroep["velden"] & {
    klant_adres: string | null;
    werkomschrijving: string | null;
    startdatum: string | null;
    starttijd: string | null;
  } {
    let meldingen: ParsedPdf["meldingen"] = [];
    try {
      meldingen = meldingenJson ? JSON.parse(meldingenJson) : [];
    } catch {
      meldingen = [];
    }
    return {
      klant_naam: naam || null,
      klant_adres: adres || null,
      referentienummer: ref || null,
      adviseur: adviseur || null,
      klant_telefoon: telefoon || null,
      klant_email: email || null,
      documenttype: (documenttype || "onbekend") as ParsedPdf["documenttype"],
      leverweek: leverweek || null,
      keukenzaak: keukenzaak || null,
      meldingen,
      adressen: adresKandidaten,
      werkomschrijving: werkomschrijving || null,
      startdatum: datum || null,
      starttijd: tijd || null,
    };
  }

  async function maakAan(klussen: Array<{ velden: unknown; documenten: GeUploadDocument[] }>) {
    const res = await fetch("/api/opdrachten/aanmaken", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ klussen }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? `Aanmaken mislukt (${res.status})`);
    return body.aangemaakt as Array<{ id: string; klant_naam: string | null }>;
  }

  /** Waarschuwt als een referentienummer al bestaat (mogelijke dubbele order). False = gebruiker stopt. */
  async function bevestigGeenDubbel(refs: Array<string | null | undefined>): Promise<boolean> {
    const unieke = [...new Set(refs.map((r) => r?.trim()).filter(Boolean) as string[])];
    for (const r of unieke) {
      try {
        const res = await fetch(`/api/opdrachten/ref-bestaat?ref=${encodeURIComponent(r)}`);
        if (!res.ok) continue;
        const { klussen } = await res.json();
        if (Array.isArray(klussen) && klussen.length > 0) {
          const k = klussen[0];
          const detail = [k.klant_naam, k.opdracht_status].filter(Boolean).join(" · ");
          if (
            !window.confirm(
              `Let op: er bestaat al een klus met referentie ${r}${detail ? ` (${detail})` : ""}. ` +
                "Mogelijk een dubbele. Toch aanmaken?",
            )
          ) {
            return false;
          }
        }
      } catch {
        // Check faalt: niet blokkeren, liever doorlaten dan het inschieten tegenhouden.
      }
    }
    return true;
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (bezigRef.current) return;

    // Meer-klussen-modus: bouw één klus per groep met ten minste één toegewezen bestand.
    if (groepen) {
      const klussen = groepen
        .map((g, gi) => {
          const extra = groepExtra[gi] ?? {};
          return {
            velden: {
              ...g.velden,
              startdatum: extra.datum || null,
              starttijd: extra.tijd || null,
              werkomschrijving: extra.werk || null,
            },
            documenten: geupload.filter((d) => toewijzing[d.pad] === gi),
          };
        })
        .filter((k) => k.documenten.length > 0);
      if (klussen.length === 0) {
        setStatus("error");
        setMessage("Wijs minstens één bestand aan een klus toe.");
        return;
      }
      if (
        !(await bevestigGeenDubbel(
          klussen.map((k) => (k.velden as { referentienummer?: string | null }).referentienummer),
        ))
      ) {
        return;
      }
      bezigRef.current = true;
      setStatus("saving");
      setMessage("");
      try {
        const aangemaakt = await maakAan(klussen);
        reset();
        setOpen(false);
        setStatus("success");
        setMessage(`${aangemaakt.length} klussen toegevoegd`);
        router.refresh();
        vernieuwOfflineCache();
        setTimeout(() => setStatus("idle"), 4000);
      } catch (err) {
        setStatus("error");
        setMessage((err as Error).message);
      } finally {
        bezigRef.current = false;
      }
      return;
    }

    // Eén-klus-modus.
    const velden = veldenUitFormulier();
    const heeftIets =
      Boolean(velden.klant_naam || velden.klant_adres || velden.referentienummer || velden.klant_telefoon ||
        velden.klant_email || velden.keukenzaak || velden.werkomschrijving || velden.startdatum) ||
      geupload.length > 0;
    if (!heeftIets) {
      setStatus("error");
      setMessage("Voeg een document toe of vul minstens één veld in.");
      return;
    }
    if (adresKandidaten.length > 0 && !adres.trim()) {
      setStatus("error");
      setMessage("Kies eerst de montagelocatie; er staan meerdere adressen op de order.");
      return;
    }
    if (!(await bevestigGeenDubbel([velden.referentienummer]))) return;
    bezigRef.current = true;
    setStatus("saving");
    setMessage("");
    try {
      const aangemaakt = await maakAan([{ velden, documenten: geupload }]);
      const naamDeel = aangemaakt[0]?.klant_naam ? `: ${aangemaakt[0].klant_naam}` : naam ? `: ${naam}` : "";
      reset();
      setOpen(false);
      setStatus("success");
      setMessage(`Klus toegevoegd${naamDeel}`);
      router.refresh();
      vernieuwOfflineCache();
      setTimeout(() => setStatus("idle"), 4000);
    } catch (err) {
      setStatus("error");
      setMessage((err as Error).message);
    } finally {
      bezigRef.current = false;
    }
  }

  const titel = kantoor ? "Nieuwe klus" : "Klus toevoegen";

  return (
    <div className="flex flex-col gap-2">
      <HydratieKlaar />
      <input ref={inputRef} type="file" accept="application/pdf,image/*" multiple hidden onChange={handleFiles} disabled={parsing || saving} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" hidden onChange={handleFiles} disabled={parsing || saving} />

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent after:absolute after:left-0 after:-bottom-[2px] after:h-1 after:w-20 after:bg-accent after:content-['']"
        >
          <Plus size={22} strokeWidth={2.75} aria-hidden="true" />
          {titel}
        </button>
      ) : (
        <form onSubmit={opslaan} className="border-2 border-ink bg-white">
          <div className="flex items-center gap-2 bg-ink px-4 py-3">
            <Plus size={18} strokeWidth={2.75} className="shrink-0 text-accent" aria-hidden="true" />
            <h2 className="font-mono text-lg font-extrabold tracking-tight text-white">{titel}</h2>
            <button type="button" onClick={sluit} aria-label="Sluiten" className="ml-auto flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-accent">
              <X size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-sm text-ink-muted">
              Voeg een PDF of foto van de order toe (meerdere mag, ook grote tekeningen), dan vult de app de
              velden vanzelf in. Niets is verplicht, je kunt alles aanpassen.
            </p>

            {parsing ? (
              <div className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                {uploadVoortgang && uploadVoortgang.gedaan < uploadVoortgang.totaal
                  ? `Uploaden: bestand ${uploadVoortgang.gedaan + 1} van ${uploadVoortgang.totaal}…`
                  : "Documenten inlezen…"}
              </div>
            ) : !online ? (
              <div className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-ink-muted">
                <CloudOff size={18} strokeWidth={2.5} aria-hidden="true" />
                Order toevoegen – netwerk nodig
              </div>
            ) : (
              <div className="flex gap-2">
                <button type="button" onClick={() => inputRef.current?.click()} disabled={saving} className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
                  <Paperclip size={18} strokeWidth={2.5} aria-hidden="true" />
                  Bestand kiezen
                </button>
                <button type="button" onClick={() => cameraInputRef.current?.click()} disabled={saving} className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
                  <Camera size={18} strokeWidth={2.5} aria-hidden="true" />
                  Order fotograferen
                </button>
              </div>
            )}

            {parseInfo && (
              <p className="border-l-2 border-accent bg-surface px-3 py-2 text-sm text-ink">{parseInfo}</p>
            )}

            {groepen ? (
              <MeerKlussen
                groepen={groepen}
                docs={geupload}
                toewijzing={toewijzing}
                extra={groepExtra}
                onWijzig={(pad, gi) => setToewijzing((t) => ({ ...t, [pad]: gi }))}
                onExtra={(gi, veld, waarde) =>
                  setGroepExtra((e) => ({ ...e, [gi]: { ...e[gi], [veld]: waarde } }))
                }
              />
            ) : (
              <>
                {geupload.length > 0 && (
                  <ul className="flex flex-col gap-1">
                    {geupload.map((f) => (
                      <li key={f.pad} className="flex items-center gap-2 border border-line bg-surface px-2 py-1.5 text-sm text-ink">
                        {f.type === "application/pdf" ? (
                          <FileText size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
                        ) : (
                          <ImageIcon size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
                        )}
                        <span className="min-w-0 flex-1 truncate">{f.naam}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <label className={labelKlasse}>
                  {KLUS_VELD.klant_naam.label}
                  <input value={naam} onChange={(e) => setNaam(e.target.value)} className={veldKlasse} placeholder={KLUS_VELD.klant_naam.placeholder} />
                </label>
                {adresKandidaten.length > 0 ? (
                  <AdresKeuze kandidaten={adresKandidaten} waarde={adres} onKies={setAdres} />
                ) : (
                  <label className={labelKlasse}>
                    {KLUS_VELD.klant_adres.label}
                    <input value={adres} onChange={(e) => setAdres(e.target.value)} className={veldKlasse} placeholder={KLUS_VELD.klant_adres.placeholder} />
                  </label>
                )}

                <div className="flex gap-3">
                  <label className={`${labelKlasse} flex-1`}>
                    Datum
                    <input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} className={veldKlasse} />
                  </label>
                  <label className={`${labelKlasse} w-32`}>
                    Tijd
                    <input type="time" value={tijd} onChange={(e) => setTijd(e.target.value)} className={veldKlasse} />
                  </label>
                </div>

                <div className="flex gap-3">
                  <label className={`${labelKlasse} flex-1`}>
                    {KLUS_VELD.referentienummer.label}
                    <input value={ref} onChange={(e) => setRef(e.target.value)} className={veldKlasse} placeholder={KLUS_VELD.referentienummer.placeholder} />
                  </label>
                  <label className={`${labelKlasse} flex-1`}>
                    {KLUS_VELD.klant_telefoon.label}
                    <input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} inputMode="tel" className={veldKlasse} placeholder={KLUS_VELD.klant_telefoon.placeholder} />
                  </label>
                </div>

                <label className={labelKlasse}>
                  {KLUS_VELD.klant_email.label}
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={veldKlasse} placeholder={KLUS_VELD.klant_email.placeholder} />
                </label>
                <label className={labelKlasse}>
                  Keukenzaak / opdrachtgever
                  <input value={keukenzaak} onChange={(e) => setKeukenzaak(e.target.value)} className={veldKlasse} placeholder="Bijv. Keukenstudio Voorschoten" />
                </label>

                <div className={labelKlasse}>
                  {KLUS_VELD.werkomschrijving.label}
                  <textarea value={werkomschrijving} onChange={(e) => setWerkomschrijving(e.target.value)} rows={3} placeholder={KLUS_VELD.werkomschrijving.placeholder} className="min-h-[72px] w-full rounded-none border border-line bg-white p-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent" />
                  <span className="mt-1 block text-xs font-normal text-ink-muted">
                    {kantoor ? "Wat de monteur moet doen op locatie. Hij ziet dit bij de klus." : "Alleen voor jezelf, komt niet in het opleverrapport."}
                  </span>
                  <div className="mt-1">
                    <SpraakOpname onTekst={(t) => setWerkomschrijving((prev) => (prev ? `${prev} ${t}` : t))} />
                  </div>
                </div>
              </>
            )}

            <button type="submit" disabled={saving || parsing || !online} className="mt-1 inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-[filter] duration-150 hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                  Opslaan…
                </>
              ) : (
                <>
                  <Check size={20} strokeWidth={2.75} aria-hidden="true" />
                  {groepen ? "Klussen aanmaken" : "Klus opslaan"}
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p className={`flex items-start gap-2 text-sm font-semibold ${status === "error" ? "text-urgent-rood" : "text-success"}`}>
          {status === "error" ? (
            <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          ) : (
            <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          )}
          {message}
        </p>
      )}
    </div>
  );
}

/** Keuze-paneel: toont de voorgestelde klussen, laat per klus datum/tijd/omschrijving invullen en
 *  laat de invoerder elk bestand aan de juiste klus toewijzen. */
function MeerKlussen({
  groepen,
  docs,
  toewijzing,
  extra,
  onWijzig,
  onExtra,
}: {
  groepen: KlusGroep[];
  docs: GeUploadDocument[];
  toewijzing: Record<string, number>;
  extra: Record<number, { datum?: string; tijd?: string; werk?: string }>;
  onWijzig: (pad: string, groepIndex: number) => void;
  onExtra: (groepIndex: number, veld: "datum" | "tijd" | "werk", waarde: string) => void;
}) {
  const klein = "min-h-[40px] w-full rounded-none border border-line bg-white px-2 text-sm text-ink focus-visible:border-ink focus-visible:outline-2 focus-visible:outline-accent";
  return (
    <div className="flex flex-col gap-2">
      {groepen.map((g, gi) => (
        <div key={gi} className="border-2 border-line">
          <p className="bg-surface px-3 py-1.5 font-mono text-sm font-bold text-ink">
            {groepLabel(g.velden, gi)}
          </p>
          <div className="flex flex-col gap-2 p-2">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-0.5 text-xs font-semibold text-ink-muted">
                Datum
                <input type="date" value={extra[gi]?.datum ?? ""} onChange={(e) => onExtra(gi, "datum", e.target.value)} className={klein} />
              </label>
              <label className="flex w-24 flex-col gap-0.5 text-xs font-semibold text-ink-muted">
                Tijd
                <input type="time" value={extra[gi]?.tijd ?? ""} onChange={(e) => onExtra(gi, "tijd", e.target.value)} className={klein} />
              </label>
            </div>
            <label className="flex flex-col gap-0.5 text-xs font-semibold text-ink-muted">
              Omschrijving (optioneel)
              <input type="text" value={extra[gi]?.werk ?? ""} onChange={(e) => onExtra(gi, "werk", e.target.value)} placeholder="Bijv. kasten nastellen" className={klein} />
            </label>
          </div>
        </div>
      ))}
      <p className="text-xs font-semibold text-ink-muted">Welk bestand hoort bij welke klus?</p>
      <ul className="flex flex-col gap-1">
        {docs.map((d) => (
          <li key={d.pad} className="flex items-center gap-2 border border-line bg-surface px-2 py-1.5 text-sm text-ink">
            {d.type === "application/pdf" ? (
              <FileText size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
            ) : (
              <ImageIcon size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate">{d.naam}</span>
            <select
              value={toewijzing[d.pad] ?? -1}
              onChange={(e) => onWijzig(d.pad, Number(e.target.value))}
              aria-label={`Klus voor ${d.naam}`}
              className="max-w-[45%] shrink-0 border border-line bg-white px-1 py-1 text-xs text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              {groepen.map((g, gi) => (
                <option key={gi} value={gi}>
                  {groepLabel(g.velden, gi)}
                </option>
              ))}
              <option value={-1}>Niet aanmaken</option>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
