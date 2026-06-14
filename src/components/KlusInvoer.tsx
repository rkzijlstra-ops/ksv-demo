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
import type { ParsedPdf } from "@/lib/parser-schema";

type Status = "idle" | "parsing" | "saving" | "success" | "error";

/**
 * Eén gedeeld component om een klus in te voeren (invoer-unificatie part 2). Eén motor, twee gezichten:
 * - context "monteur": de monteur schiet zelf een order in (eigen werkpool, ad-hoc). Werk-veld is intern.
 * - context "kantoor": Ed maakt een klus voor zijn zaak; die landt in "te plannen". Werk-veld = wat de
 *   monteur moet doen (de monteur ziet het op zijn klus).
 * De bestemming (werkpool vs te plannen, toewijzing, zaak) bepaalt de server rol-bewust; dit component
 * stuurt alleen de velden. Document (PDF/foto) is optioneel: een PDF/foto van de order wordt uitgelezen
 * en vult de velden voor.
 */
const veldKlasse =
  "min-h-[48px] w-full rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";
const labelKlasse = "flex flex-col gap-1 text-sm font-semibold text-ink";

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

  const [files, setFiles] = useState<File[]>([]);
  const [geparsed, setGeparsed] = useState(false);

  const [naam, setNaam] = useState("");
  const [adres, setAdres] = useState("");
  const [ref, setRef] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [email, setEmail] = useState("");
  const [keukenzaak, setKeukenzaak] = useState("");
  const [werkomschrijving, setWerkomschrijving] = useState("");
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("");
  // Parser-passthrough: niet getoond maar wel meegestuurd zodat niets verloren gaat.
  const [documenttype, setDocumenttype] = useState("");
  const [leverweek, setLeverweek] = useState("");
  const [adviseur, setAdviseur] = useState("");
  const [meldingenJson, setMeldingenJson] = useState("");

  const parsing = status === "parsing";
  const saving = status === "saving";

  function reset() {
    setFiles([]);
    setGeparsed(false);
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
    setAdres((v) => v || p.klant_adres || "");
    setRef((v) => v || p.referentienummer || "");
    setTelefoon((v) => v || p.klant_telefoon || "");
    setEmail((v) => v || p.klant_email || "");
    setKeukenzaak((v) => v || p.keukenzaak || "");
    setDocumenttype(p.documenttype || "");
    setLeverweek(p.leverweek || "");
    setAdviseur(p.adviseur || "");
    setMeldingenJson(Array.isArray(p.meldingen) && p.meldingen.length ? JSON.stringify(p.meldingen) : "");
    setParseInfo("Gegevens uit het document gelezen. Controleer en vul aan wat je weet.");
  }

  async function parseDocument(doc: File) {
    setStatus("parsing");
    setMessage("");
    setParseInfo("");
    try {
      const fd = new FormData();
      fd.append("actie", "parse");
      fd.append("files", doc);
      const res = await fetch("/api/opdrachten", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      vulUitParse((body.parsed as ParsedPdf | null) ?? null);
    } catch {
      setParseInfo("Kon het document niet lezen. Vul de gegevens hieronder zelf in.");
    } finally {
      setStatus("idle");
      setGeparsed(true);
    }
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const gekozen = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (gekozen.length === 0) return;
    const nieuw = [...files, ...gekozen];
    setFiles(nieuw);
    // Eerste PDF of foto erbij? Lees 'm eenmalig uit om de velden voor te vullen (order = PDF of foto).
    const order = nieuw.find((f) => f.type === "application/pdf" || f.type.startsWith("image/"));
    if (order && !geparsed) parseDocument(order);
  }

  function verwijderFile(i: number) {
    setFiles((fs) => fs.filter((_, idx) => idx !== i));
  }

  function sluit() {
    reset();
    setOpen(false);
    setStatus("idle");
  }

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (bezigRef.current) return;
    const heeftIets =
      Boolean(naam || adres || ref || telefoon || email || keukenzaak || werkomschrijving || datum) ||
      files.length > 0;
    if (!heeftIets) {
      setStatus("error");
      setMessage("Voeg een document toe of vul minstens één veld in.");
      return;
    }
    bezigRef.current = true;
    setStatus("saving");
    setMessage("");
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      fd.append("klant_naam", naam);
      fd.append("klant_adres", adres);
      fd.append("referentienummer", ref);
      fd.append("klant_telefoon", telefoon);
      fd.append("klant_email", email);
      fd.append("keukenzaak", keukenzaak);
      fd.append("werkomschrijving", werkomschrijving);
      fd.append("startdatum", datum);
      fd.append("starttijd", tijd);
      if (documenttype) fd.append("documenttype", documenttype);
      if (leverweek) fd.append("leverweek", leverweek);
      if (adviseur) fd.append("adviseur", adviseur);
      if (meldingenJson) fd.append("meldingen", meldingenJson);

      const res = await fetch("/api/opdrachten", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(body.error ?? `Opslaan mislukt (${res.status})`);
        return;
      }
      const naamDeel = body.klant_naam ? `: ${body.klant_naam}` : naam ? `: ${naam}` : "";
      reset();
      setOpen(false);
      setStatus("success");
      setMessage(`Klus toegevoegd${naamDeel}`);
      router.refresh();
      vernieuwOfflineCache();
      setTimeout(() => setStatus("idle"), 4000);
    } catch {
      setStatus("error");
      setMessage("Netwerkfout, probeer opnieuw");
    } finally {
      bezigRef.current = false;
    }
  }

  const titel = kantoor ? "Nieuwe klus" : "Klus toevoegen";

  return (
    <div className="flex flex-col gap-2">
      <HydratieKlaar />
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={handleFiles}
        disabled={parsing || saving}
      />
      {/* Aparte camera-invoer: op de telefoon opent dit direct de camera om een papieren order te
          fotograferen (de app leest 'm uit). Op desktop valt het terug op een afbeelding kiezen. */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFiles}
        disabled={parsing || saving}
      />

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
            <button
              type="button"
              onClick={sluit}
              aria-label="Sluiten"
              className="ml-auto flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-3 focus-visible:outline-accent"
            >
              <X size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4">
            <p className="text-sm text-ink-muted">
              Voeg een PDF of foto van de order toe, dan vult de app de meeste velden vanzelf in. Niets is
              verplicht, je kunt alles aanpassen.
            </p>

            {/* Order toevoegen: een PDF/foto wordt uitgelezen en vult de velden alvast voor. Op de
                telefoon kun je ook direct de order fotograferen. */}
            {parsing ? (
              <div className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                Order inlezen…
              </div>
            ) : !online ? (
              <div className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-ink-muted">
                <CloudOff size={18} strokeWidth={2.5} aria-hidden="true" />
                Order toevoegen – netwerk nodig
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={saving}
                  className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Camera size={18} strokeWidth={2.5} aria-hidden="true" />
                  Order fotograferen
                </button>
                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  disabled={saving}
                  className="inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Paperclip size={18} strokeWidth={2.5} aria-hidden="true" />
                  Bestand kiezen
                </button>
              </div>
            )}

            {files.length > 0 && (
              <ul className="flex flex-col gap-1">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                  >
                    {f.type === "application/pdf" ? (
                      <FileText size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
                    ) : (
                      <ImageIcon size={15} className="shrink-0 text-ink-muted" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1 truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => verwijderFile(i)}
                      aria-label={`${f.name} verwijderen`}
                      className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-ink-muted hover:bg-line/50 hover:text-ink focus-visible:outline-3 focus-visible:outline-primary"
                    >
                      <X size={15} strokeWidth={2.5} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {parseInfo && (
              <p className="border-l-2 border-accent bg-surface px-3 py-2 text-sm text-ink">{parseInfo}</p>
            )}

            <label className={labelKlasse}>
              Klantnaam
              <input value={naam} onChange={(e) => setNaam(e.target.value)} className={veldKlasse} placeholder="Bijv. Mevrouw Veering" />
            </label>
            <label className={labelKlasse}>
              Adres
              <input value={adres} onChange={(e) => setAdres(e.target.value)} className={veldKlasse} placeholder="Straat, postcode, plaats" />
            </label>

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
                Referentie
                <input value={ref} onChange={(e) => setRef(e.target.value)} className={veldKlasse} placeholder="7407" />
              </label>
              <label className={`${labelKlasse} flex-1`}>
                Telefoon
                <input value={telefoon} onChange={(e) => setTelefoon(e.target.value)} inputMode="tel" className={veldKlasse} placeholder="06-12345678" />
              </label>
            </div>

            <label className={labelKlasse}>
              E-mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" className={veldKlasse} placeholder="klant@voorbeeld.nl" />
            </label>
            <label className={labelKlasse}>
              Keukenzaak / opdrachtgever
              <input value={keukenzaak} onChange={(e) => setKeukenzaak(e.target.value)} className={veldKlasse} placeholder="Bijv. Keukenstudio Voorschoten" />
            </label>

            <div className={labelKlasse}>
              Wat moet er gebeuren?
              <textarea
                value={werkomschrijving}
                onChange={(e) => setWerkomschrijving(e.target.value)}
                rows={3}
                placeholder="Bijv. kasten nastellen. Typ of spreek in."
                className="min-h-[72px] w-full rounded-none border border-line bg-white p-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
              />
              <span className="mt-1 block text-xs font-normal text-ink-muted">
                {kantoor
                  ? "Wat de monteur moet doen op locatie. Hij ziet dit bij de klus."
                  : "Alleen voor jezelf, komt niet in het opleverrapport."}
              </span>
              <div className="mt-1">
                <SpraakOpname onTekst={(t) => setWerkomschrijving((prev) => (prev ? `${prev} ${t}` : t))} />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || parsing || !online}
              className="mt-1 inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-accent px-4 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-[filter] duration-150 hover:brightness-95 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                  Opslaan…
                </>
              ) : (
                <>
                  <Check size={20} strokeWidth={2.75} aria-hidden="true" />
                  Klus opslaan
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {message && (
        <p
          className={`flex items-start gap-2 text-sm font-semibold ${
            status === "error" ? "text-urgent-rood" : "text-success"
          }`}
        >
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
