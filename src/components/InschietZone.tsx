"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, Check, AlertCircle, AlertTriangle } from "lucide-react";
import { uploadDocumenten, type GeUploadDocument } from "@/lib/document-upload";
import type { ParsedPdf } from "@/lib/parser-schema";

interface Aangemaakt {
  id: string;
  klant_naam: string | null;
  referentienummer: string | null;
  aantalDocumenten: number;
  aandacht: boolean;
}
interface Samenvatting {
  aangemaakt: Aangemaakt[];
  aantalOpdrachten: number;
  aantalDocumenten: number;
}

type Status = "idle" | "bezig" | "klaar" | "fout";

interface Groep {
  velden: ParsedPdf;
  bestanden: { naam: string; type: string; pad: string }[];
}

/**
 * Dashboard-inschieten: sleep één of meer PDF's (ook grote tekeningen) tegelijk. De bestanden gaan
 * rechtstreeks naar de opslag (geen 413), worden samen ingelezen en per klus gegroepeerd (orderbon
 * leidend; referentie-kern 166/SP166 én klantnaam horen bij elkaar). Per groep ontstaat één klus met
 * zijn documenten; bestanden zonder herkenbare klus worden een eigen klus met aandacht-markering.
 */
export function InschietZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const bezigRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [sleept, setSleept] = useState(false);
  const [fout, setFout] = useState("");
  const [voortgang, setVoortgang] = useState<{ gedaan: number; totaal: number } | null>(null);
  const [samenvatting, setSamenvatting] = useState<Samenvatting | null>(null);

  async function verwerk(files: File[]) {
    const bestanden = files.filter(
      (f) => f.type === "application/pdf" || f.type.startsWith("image/"),
    );
    if (bestanden.length === 0 || bezigRef.current) return;
    bezigRef.current = true;
    setStatus("bezig");
    setFout("");
    setSamenvatting(null);
    setVoortgang({ gedaan: 0, totaal: bestanden.length });
    try {
      const geupload = await uploadDocumenten(bestanden, (gedaan, totaal) =>
        setVoortgang({ gedaan, totaal }),
      );
      setVoortgang(null);

      const inlees = await fetch("/api/opdrachten/inlezen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paden: geupload.map((d) => ({ naam: d.naam, type: d.type, pad: d.pad })) }),
      });
      const inleesBody = await inlees.json().catch(() => ({}));
      if (!inlees.ok) {
        setStatus("fout");
        setFout(inleesBody.error ?? `Inschieten mislukt (${inlees.status})`);
        return;
      }
      const groepen = (inleesBody.groepen ?? []) as Groep[];
      const ongegroepeerd = (inleesBody.ongegroepeerd ?? []) as { naam: string; type: string; pad: string }[];

      const padNaarUrl = new Map(geupload.map((d) => [d.pad, d.publieke_url]));
      const maakDocs = (lijst: { naam: string; type: string; pad: string }[]): GeUploadDocument[] =>
        lijst.map((b) => ({ naam: b.naam, type: b.type, pad: b.pad, publieke_url: padNaarUrl.get(b.pad) ?? "" }));

      // Eén klus per groep; elk ongegroepeerd bestand wordt een eigen klus (aandacht).
      const klussen = [
        ...groepen.map((g) => ({ velden: g.velden, documenten: maakDocs(g.bestanden) })),
        ...ongegroepeerd.map((o) => ({
          velden: { documenttype: "onbekend" as const },
          documenten: maakDocs([o]),
        })),
      ];

      const aanmaak = await fetch("/api/opdrachten/aanmaken", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ klussen }),
      });
      const aanmaakBody = await aanmaak.json().catch(() => ({}));
      if (!aanmaak.ok) {
        setStatus("fout");
        setFout(aanmaakBody.error ?? `Aanmaken mislukt (${aanmaak.status})`);
        return;
      }
      const aangemaakt = (aanmaakBody.aangemaakt ?? []) as { id: string; klant_naam: string | null }[];

      setSamenvatting({
        aangemaakt: aangemaakt.map((a, i) => ({
          id: a.id,
          klant_naam: a.klant_naam,
          referentienummer: klussen[i]?.velden && "referentienummer" in klussen[i].velden
            ? ((klussen[i].velden as ParsedPdf).referentienummer ?? null)
            : null,
          aantalDocumenten: klussen[i]?.documenten.length ?? 0,
          aandacht: i >= groepen.length,
        })),
        aantalOpdrachten: aangemaakt.length,
        aantalDocumenten: geupload.length,
      });
      setStatus("klaar");
      router.refresh();
    } catch (e) {
      setStatus("fout");
      setFout(`Kon niet inschieten: ${(e as Error).message}`);
    } finally {
      bezigRef.current = false;
      setVoortgang(null);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setSleept(false);
    void verwerk(Array.from(e.dataTransfer.files));
  }

  function onKies(e: React.ChangeEvent<HTMLInputElement>) {
    void verwerk(Array.from(e.target.files ?? []));
    if (inputRef.current) inputRef.current.value = "";
  }

  const bezig = status === "bezig";

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={onKies}
        disabled={bezig}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setSleept(true);
        }}
        onDragLeave={() => setSleept(false)}
        onDrop={onDrop}
        disabled={bezig}
        className={`flex w-full cursor-pointer flex-col items-center gap-1.5 border-2 border-dashed px-4 py-6 text-center transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed ${
          sleept ? "border-accent bg-surface" : "border-primary bg-white hover:bg-surface"
        }`}
      >
        {bezig ? (
          <>
            <Loader2 size={26} className="animate-spin text-primary" aria-hidden="true" />
            <span className="text-[15px] font-extrabold uppercase tracking-[0.05em]">
              {voortgang && voortgang.gedaan < voortgang.totaal
                ? `Uploaden: bestand ${voortgang.gedaan + 1} van ${voortgang.totaal}…`
                : "Informatie inlezen…"}
            </span>
          </>
        ) : (
          <>
            <UploadCloud size={26} strokeWidth={2.2} className="text-primary" aria-hidden="true" />
            <span className="text-[15px] font-extrabold uppercase tracking-[0.05em]">
              Sleep PDF&apos;s hier om klussen in te schieten
            </span>
            <span className="text-[13.5px] text-ink-muted">
              Meerdere tegelijk kan, ook grote tekeningen. Documenten van dezelfde klus worden samengevoegd
              (orderbon leidend); andere klussen worden apart. Of klik om te kiezen.
            </span>
          </>
        )}
      </button>

      {status === "klaar" && samenvatting && (
        <div className="mt-3 border-2 border-success bg-white p-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-success">
            <Check size={18} strokeWidth={2.5} aria-hidden="true" />
            {samenvatting.aantalOpdrachten}{" "}
            {samenvatting.aantalOpdrachten === 1 ? "klus" : "klussen"} aangemaakt uit{" "}
            {samenvatting.aantalDocumenten}{" "}
            {samenvatting.aantalDocumenten === 1 ? "document" : "documenten"}
          </p>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px] text-ink">
            {samenvatting.aangemaakt.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-semibold">{a.klant_naam ?? "Onbekende klant"}</span>
                {a.referentienummer && (
                  <span className="bg-surface px-1.5 py-0.5 font-mono text-xs font-bold">
                    {a.referentienummer}
                  </span>
                )}
                <span className="text-ink-muted">
                  {a.aantalDocumenten} {a.aantalDocumenten === 1 ? "document" : "documenten"}
                </span>
                {a.aandacht && (
                  <span className="inline-flex items-center gap-1 font-bold text-urgent-rood">
                    <AlertTriangle size={14} strokeWidth={2.5} aria-hidden="true" />
                    geen referentie, controleren
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === "fout" && (
        <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
