"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, AlertTriangle, Send, Loader2, Check } from "lucide-react";
import { KopieerKnop } from "./KopieerKnop";
import { bouwWhatsappTekst } from "@/lib/oplever-mail";
import { formatDatumKort } from "@/lib/datum";

type Verzending = {
  id: string;
  created_at: string;
  doelgroep: "klant" | "zaak";
  naar: string;
};

/**
 * Blijvend, inklapbaar blok op de klus met de verzendgeschiedenis van het opleverrapport.
 * Is dit de eerste mail ooit naar het domein van de zaak (eersteKeer), dan toont het een
 * waarschuwing (kans op spam), een kopieerbare WhatsApp-tekst voor de monteur, en de mogelijkheid
 * om opnieuw te versturen met een gecorrigeerd adres. Werkt voor monteur én kantoor.
 */
export function VerzendInfoBlok({
  opdrachtId,
  verzendingen,
  eersteKeer,
  klantNaam,
  referentienummer,
  standaardOpen,
}: {
  opdrachtId: string;
  verzendingen: Verzending[];
  eersteKeer: boolean;
  klantNaam: string | null;
  referentienummer: string | null;
  standaardOpen?: boolean;
}) {
  const router = useRouter();
  const laatsteZaak = verzendingen.find((v) => v.doelgroep === "zaak") ?? verzendingen[0];
  const [open, setOpen] = useState(standaardOpen ?? eersteKeer);
  const [adres, setAdres] = useState(laatsteZaak?.naar ?? "");
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");

  if (!laatsteZaak) return null;

  const whatsappTekst = bouwWhatsappTekst({ klantNaam, referentienummer });

  async function opnieuwVersturen() {
    setBezig(true);
    setFout("");
    setKlaar(false);
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/rapport`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doelgroep: "zaak", naar: adres }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Versturen mislukt (${res.status})`);
        return;
      }
      setKlaar(true);
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <section className={`mt-6 border-2 ${eersteKeer ? "border-urgent-geel bg-urgent-geel/10" : "border-line bg-white"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
            Oplevering verstuurd
          </span>
          <span className="mt-0.5 block break-all text-sm text-ink">
            {laatsteZaak.naar} · {formatDatumKort(laatsteZaak.created_at)}
          </span>
        </span>
        {open ? (
          <ChevronUp size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
        ) : (
          <ChevronDown size={18} className="shrink-0 text-ink-muted" aria-hidden="true" />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t-2 border-line px-4 py-4">
          {eersteKeer && (
            <div className="flex flex-col gap-2">
              <p className="flex items-start gap-2 text-sm font-semibold text-ink">
                <AlertTriangle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-urgent-geel" aria-hidden="true" />
                Eerste keer naar dit adres. De mail kan in hun spam-map staan. Stuur dit bericht even
                door naar je contact bij de zaak, en vraag planning@kluslus.nl als veilige afzender toe te voegen.
              </p>
              <div className="flex items-center justify-between gap-2 border border-line bg-white p-3">
                <p className="min-w-0 flex-1 text-sm text-ink-muted">{whatsappTekst}</p>
                <KopieerKnop tekst={whatsappTekst} label="Kopieer bericht" />
              </div>
            </div>
          )}

          {verzendingen.length > 1 && (
            <ul className="flex flex-col gap-1">
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
          )}

          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <label className="text-xs font-bold uppercase tracking-[0.05em] text-ink-muted">
              Opnieuw versturen naar de zaak
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="min-h-[44px] min-w-0 flex-1 border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
                value={adres}
                onChange={(e) => {
                  setAdres(e.target.value);
                  setKlaar(false);
                }}
                inputMode="email"
                placeholder="adres van de zaak"
              />
              <button
                type="button"
                onClick={opnieuwVersturen}
                disabled={bezig || !adres.trim()}
                className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
              >
                {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
                {klaar && !bezig ? <Check size={16} strokeWidth={2.5} aria-hidden="true" /> : <Send size={16} aria-hidden="true" />}
                {klaar && !bezig ? "Verstuurd" : "Opnieuw versturen"}
              </button>
            </div>
            {fout && <p className="text-sm font-semibold text-urgent-rood">{fout}</p>}
          </div>
        </div>
      )}
    </section>
  );
}
