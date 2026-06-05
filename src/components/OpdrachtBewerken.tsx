"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PencilLine, Loader2, Check, AlertCircle, X } from "lucide-react";

type Documenttype = "orderbevestiging" | "werkbon_service" | "tekst" | "onbekend";

const TYPE_OPTIES: { waarde: Documenttype; label: string }[] = [
  { waarde: "orderbevestiging", label: "Montage" },
  { waarde: "werkbon_service", label: "Service" },
  { waarde: "onbekend", label: "Onbekend" },
];

export function OpdrachtBewerken(props: {
  id: string;
  klant_naam: string | null;
  klant_adres: string | null;
  klant_telefoon: string | null;
  referentienummer: string | null;
  keukenzaak: string | null;
  documenttype: Documenttype;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");
  const [klaar, setKlaar] = useState(false);

  const [naam, setNaam] = useState(props.klant_naam ?? "");
  const [adres, setAdres] = useState(props.klant_adres ?? "");
  const [tel, setTel] = useState(props.klant_telefoon ?? "");
  const [ref, setRef] = useState(props.referentienummer ?? "");
  const [zaak, setZaak] = useState(props.keukenzaak ?? "");
  const [type, setType] = useState<Documenttype>(
    props.documenttype === "tekst" ? "onbekend" : props.documenttype,
  );

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout("");
    setKlaar(false);
    try {
      const res = await fetch(`/api/opdrachten/${props.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          klant_naam: naam,
          klant_adres: adres,
          klant_telefoon: tel,
          referentienummer: ref,
          keukenzaak: zaak,
          documenttype: type,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Opslaan mislukt (${res.status})`);
        return;
      }
      setKlaar(true);
      setOpen(false);
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  const veld =
    "min-h-[44px] border-2 border-line bg-white px-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  if (!open) {
    return (
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 border-2 border-line bg-white px-3 text-sm font-bold text-ink hover:bg-surface"
        >
          <PencilLine size={16} aria-hidden="true" /> Gegevens corrigeren
        </button>
        {klaar && (
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
            <Check size={16} strokeWidth={2.5} aria-hidden="true" /> Opgeslagen
          </span>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={opslaan} className="mt-3 flex flex-col gap-3 border-2 border-ink bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="font-bold text-ink">Gegevens corrigeren</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Sluiten"
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center text-ink-muted hover:bg-line/40"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Klantnaam
        <input value={naam} onChange={(e) => setNaam(e.target.value)} className={veld} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Adres
        <input value={adres} onChange={(e) => setAdres(e.target.value)} className={veld} />
      </label>
      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-ink">
          Referentie
          <input value={ref} onChange={(e) => setRef(e.target.value)} className={veld} />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm font-semibold text-ink">
          Telefoon
          <input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" className={veld} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Keukenzaak
        <input value={zaak} onChange={(e) => setZaak(e.target.value)} className={veld} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Type
        <select value={type} onChange={(e) => setType(e.target.value as Documenttype)} className={veld}>
          {TYPE_OPTIES.map((o) => (
            <option key={o.waarde} value={o.waarde}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="submit"
        disabled={bezig}
        className="flex min-h-[48px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-2.5 text-base font-extrabold uppercase tracking-[0.05em] text-white disabled:opacity-60"
      >
        {bezig ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : null}
        Opslaan
      </button>

      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </form>
  );
}
