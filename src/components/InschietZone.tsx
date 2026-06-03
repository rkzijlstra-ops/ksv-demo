"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Loader2, Check, AlertCircle, AlertTriangle } from "lucide-react";

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

export function InschietZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const bezigRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [sleept, setSleept] = useState(false);
  const [fout, setFout] = useState("");
  const [samenvatting, setSamenvatting] = useState<Samenvatting | null>(null);

  async function verwerk(files: File[]) {
    if (files.length === 0 || bezigRef.current) return;
    bezigRef.current = true;
    setStatus("bezig");
    setFout("");
    setSamenvatting(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/dashboard/inschieten", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("fout");
        setFout(body.error ?? `Inschieten mislukt (${res.status})`);
        return;
      }
      setSamenvatting(body as Samenvatting);
      setStatus("klaar");
      router.refresh();
    } catch {
      setStatus("fout");
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      bezigRef.current = false;
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
        accept="application/pdf"
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
              Informatie inlezen…
            </span>
          </>
        ) : (
          <>
            <UploadCloud size={26} strokeWidth={2.2} className="text-primary" aria-hidden="true" />
            <span className="text-[15px] font-extrabold uppercase tracking-[0.05em]">
              Sleep PDF&apos;s hier om opdrachten in te schieten
            </span>
            <span className="text-[13.5px] text-ink-muted">
              Meerdere tegelijk kan. Dezelfde referentie wordt één opdracht, verschillende
              referenties worden aparte opdrachten. Of klik om te kiezen.
            </span>
          </>
        )}
      </button>

      {status === "klaar" && samenvatting && (
        <div className="mt-3 border-2 border-success bg-white p-3">
          <p className="flex items-center gap-2 text-sm font-extrabold text-success">
            <Check size={18} strokeWidth={2.5} aria-hidden="true" />
            {samenvatting.aantalOpdrachten}{" "}
            {samenvatting.aantalOpdrachten === 1 ? "opdracht" : "opdrachten"} aangemaakt uit{" "}
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
