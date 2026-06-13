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
} from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";
import { useOfflineState } from "@/lib/use-offline-state";
import { HydratieKlaar } from "@/components/HydratieKlaar";
import type { ParsedPdf } from "@/lib/parser-schema";

type Status = "idle" | "parsing" | "saving" | "success" | "error";

const veldKlasse =
  "min-h-[48px] w-full rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";
const labelKlasse = "flex flex-col gap-1 text-sm font-semibold text-ink";

/**
 * Eén flow om zelf een klus toe te voegen: een document (PDF, foto of tekening) is optioneel. Zit er
 * een PDF bij, dan leest de parser de gegevens alvast in; de monteur controleert en vult aan wat hij
 * weet, of neemt er genoegen mee. Niets is verplicht zolang er een document of minstens één veld is.
 */
export function OpdrachtAanmaken() {
  const router = useRouter();
  const { online } = useOfflineState();
  const inputRef = useRef<HTMLInputElement>(null);
  const bezigRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [parseInfo, setParseInfo] = useState("");

  const [files, setFiles] = useState<File[]>([]);
  const [geparsed, setGeparsed] = useState(false);

  // Zichtbare, bewerkbare velden.
  const [naam, setNaam] = useState("");
  const [adres, setAdres] = useState("");
  const [ref, setRef] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [email, setEmail] = useState("");
  const [keukenzaak, setKeukenzaak] = useState("");
  const [datum, setDatum] = useState("");
  const [tijd, setTijd] = useState("");
  // Parser-passthrough: niet getoond maar wel meegestuurd, zodat niets verloren gaat.
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
      setParseInfo("Kon de PDF niet automatisch lezen. Vul de gegevens hieronder zelf in.");
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
    setParseInfo("Gegevens uit de PDF gelezen. Controleer en vul aan wat je weet.");
  }

  async function parsePdf(pdf: File) {
    setStatus("parsing");
    setMessage("");
    setParseInfo("");
    try {
      const fd = new FormData();
      fd.append("actie", "parse");
      fd.append("files", pdf);
      const res = await fetch("/api/opdrachten", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      vulUitParse((body.parsed as ParsedPdf | null) ?? null);
    } catch {
      setParseInfo("Kon de PDF niet lezen. Vul de gegevens hieronder zelf in.");
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
    // Eerste PDF erbij? Lees 'm eenmalig uit om de velden voor te vullen.
    const pdf = nieuw.find((f) => f.type === "application/pdf");
    if (pdf && !geparsed) parsePdf(pdf);
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
      Boolean(naam || adres || ref || telefoon || email || keukenzaak || datum) || files.length > 0;
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

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent after:absolute after:left-0 after:-bottom-[2px] after:h-1 after:w-20 after:bg-accent after:content-['']"
        >
          <Plus size={22} strokeWidth={2.75} aria-hidden="true" />
          Klus toevoegen
        </button>
      ) : (
        <form onSubmit={opslaan} className="border-2 border-ink bg-white">
          <div className="flex items-center gap-2 bg-ink px-4 py-3">
            <Plus size={18} strokeWidth={2.75} className="shrink-0 text-accent" aria-hidden="true" />
            <h2 className="font-mono text-lg font-extrabold tracking-tight text-white">Klus toevoegen</h2>
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
              Vul in wat je weet. Niets is verplicht, de rest kun je later aanvullen.
            </p>

            {/* Document optioneel: zit er een PDF bij, dan vullen we de velden alvast voor. */}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={parsing || saving || !online}
              className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-line bg-surface px-3 text-sm font-semibold text-primary transition-colors duration-150 hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {parsing ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  Document inlezen…
                </>
              ) : !online ? (
                <>
                  <CloudOff size={18} strokeWidth={2.5} aria-hidden="true" />
                  Document toevoegen – netwerk nodig
                </>
              ) : (
                <>
                  <Paperclip size={18} strokeWidth={2.5} aria-hidden="true" />
                  Document toevoegen (PDF, foto of tekening)
                </>
              )}
            </button>

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
