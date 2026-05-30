"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Check, AlertCircle, PencilLine, X, CloudOff } from "lucide-react";
import { vernieuwOfflineCache } from "@/lib/sw-cache";
import { useOfflineState } from "@/lib/use-offline-state";

type Status = "idle" | "uploading" | "success" | "error";

export function OpdrachtAanmaken() {
  const router = useRouter();
  const { online } = useOfflineState();
  const inputRef = useRef<HTMLInputElement>(null);
  const bezigRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [handmatig, setHandmatig] = useState(false);

  // handmatige velden
  const [naam, setNaam] = useState("");
  const [adres, setAdres] = useState("");
  const [ref, setRef] = useState("");
  const [telefoon, setTelefoon] = useState("");

  const bezig = status === "uploading";

  async function verstuur(fd: FormData, gelukteMelding: (body: Record<string, unknown>) => string) {
    // Failsafe tegen dubbel-tap: ref reageert synchroon (state-update kan een tick later).
    if (bezigRef.current) return false;
    bezigRef.current = true;
    setStatus("uploading");
    setMessage("");
    try {
      const res = await fetch("/api/opdrachten", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(body.error ?? `Aanmaken mislukt (${res.status})`);
        return false;
      }
      setStatus("success");
      setMessage(gelukteMelding(body));
      router.refresh();
      vernieuwOfflineCache();
      setTimeout(() => setStatus("idle"), 4000);
      return true;
    } catch {
      setStatus("error");
      setMessage("Netwerkfout, probeer opnieuw");
      return false;
    } finally {
      bezigRef.current = false;
    }
  }

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    await verstuur(fd, (body) => {
      const aantal = Array.isArray(body.documenten) ? body.documenten.length : 0;
      const naamDeel = body.klant_naam ? `: ${body.klant_naam}` : "";
      return `Opdracht toegevoegd${naamDeel} (${aantal} ${aantal === 1 ? "document" : "documenten"})`;
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleHandmatig(e: React.FormEvent) {
    e.preventDefault();
    const fd = new FormData();
    fd.append("klant_naam", naam);
    fd.append("klant_adres", adres);
    fd.append("referentienummer", ref);
    fd.append("klant_telefoon", telefoon);
    const ok = await verstuur(fd, (body) =>
      `Opdracht toegevoegd${body.klant_naam ? `: ${body.klant_naam}` : naam ? `: ${naam}` : ""}`,
    );
    if (ok) {
      setNaam("");
      setAdres("");
      setRef("");
      setTelefoon("");
      setHandmatig(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        multiple
        hidden
        onChange={handleFiles}
        disabled={bezig}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={bezig || !online}
        className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 border-2 border-ink bg-white px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-ink transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:left-0 after:-bottom-[2px] after:h-1 after:w-20 after:bg-accent after:content-['']"
      >
        {bezig ? (
          <>
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            Bezig…
          </>
        ) : !online ? (
          <>
            <CloudOff size={22} strokeWidth={2.5} aria-hidden="true" />
            Documenten toevoegen – netwerk nodig
          </>
        ) : (
          <>
            <Upload size={22} strokeWidth={2.5} aria-hidden="true" />
            Documenten toevoegen (PDF of foto)
          </>
        )}
      </button>

      {!handmatig ? (
        <button
          type="button"
          onClick={() => setHandmatig(true)}
          disabled={bezig || !online}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 text-sm font-semibold text-primary hover:underline focus-visible:outline-3 focus-visible:outline-primary disabled:opacity-60"
        >
          <PencilLine size={18} strokeWidth={2.5} aria-hidden="true" />
          Of: opdracht zonder document
        </button>
      ) : (
        <form
          onSubmit={handleHandmatig}
          className="flex flex-col gap-3 rounded-none border border-line bg-surface p-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-bold text-ink">Handmatige opdracht</span>
            <button
              type="button"
              onClick={() => setHandmatig(false)}
              aria-label="Handmatige opdracht sluiten"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-none text-ink-muted hover:bg-line/40 focus-visible:outline-3 focus-visible:outline-primary"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Klantnaam
            <input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
              placeholder="Bijv. Mevrouw Veering"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
            Adres
            <input
              value={adres}
              onChange={(e) => setAdres(e.target.value)}
              className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
              placeholder="Straat, postcode, plaats"
            />
          </label>
          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-ink">
              Referentie
              <input
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
                placeholder="7407"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-ink">
              Telefoon
              <input
                value={telefoon}
                onChange={(e) => setTelefoon(e.target.value)}
                inputMode="tel"
                className="min-h-[48px] rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:outline-3 focus-visible:outline-primary"
                placeholder="06-12345678"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={bezig || (!naam && !adres && !ref && !telefoon)}
            className="flex min-h-[56px] cursor-pointer items-center justify-center gap-2 rounded-none bg-primary px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {bezig ? <Loader2 size={22} className="animate-spin" aria-hidden="true" /> : null}
            Opdracht aanmaken
          </button>
        </form>
      )}

      {status === "success" && (
        <p className="flex items-center gap-2 text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2.5} aria-hidden="true" />
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {message}
        </p>
      )}
    </div>
  );
}
