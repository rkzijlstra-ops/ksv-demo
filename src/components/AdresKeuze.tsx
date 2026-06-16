"use client";

import { useId, useState } from "react";
import { MapPin } from "lucide-react";
import type { AdresKandidaat, AdresSoort } from "@/lib/parser-schema";

/**
 * Adres-keuze (blok 20): toont de adressen die op de order stonden zodat een mens BEWUST de
 * montagelocatie kiest. Niets staat voorgeselecteerd (anders accepteert iemand stilletjes het
 * verkeerde adres). Presentational + controlled: de ouder houdt de gekozen waarde vast.
 * Een "ander adres"-optie laat handmatig invullen als geen van de gevonden adressen klopt.
 */

const SOORT_LABEL: Record<AdresSoort, string> = {
  montage: "montagelocatie",
  opdrachtgever: "opdrachtgever / bedrijf",
  factuur: "factuuradres",
  onbekend: "onbekend",
};

export function AdresKeuze({
  kandidaten,
  waarde,
  onKies,
}: {
  kandidaten: AdresKandidaat[];
  /** Het gekozen adres ("" = nog niets gekozen). */
  waarde: string;
  onKies: (adres: string) => void;
}) {
  const naam = useId();
  const isKandidaat = kandidaten.some((k) => k.adres === waarde);
  // "ander adres"-modus: handmatig invullen. Begint aan als er al een niet-kandidaat-waarde staat.
  const [anderModus, setAnderModus] = useState(waarde !== "" && !isKandidaat);

  return (
    <fieldset className="flex flex-col gap-2 border-2 border-urgent-geel bg-urgent-geel/10 p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-extrabold text-ink">
        <MapPin size={15} strokeWidth={2.5} aria-hidden="true" />
        Meerdere adressen gevonden — kies de montagelocatie
      </legend>
      <p className="text-xs text-ink-muted">
        Op de order staan meerdere adressen. Kies waar de monteur de keuken plaatst, zodat hij niet
        naar het verkeerde adres rijdt.
      </p>

      {kandidaten.map((k, i) => {
        const id = `${naam}-${i}`;
        return (
          <label
            key={id}
            htmlFor={id}
            className="flex cursor-pointer items-start gap-2 border border-line bg-white px-3 py-2 text-sm"
          >
            <input
              type="radio"
              id={id}
              name={naam}
              className="mt-1 shrink-0"
              checked={!anderModus && waarde === k.adres}
              onChange={() => {
                setAnderModus(false);
                onKies(k.adres);
              }}
            />
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-ink">{k.adres}</span>
              <span className="text-xs uppercase tracking-[0.04em] text-ink-muted">
                {SOORT_LABEL[k.soort]}
              </span>
            </span>
          </label>
        );
      })}

      <label
        htmlFor={`${naam}-ander`}
        className="flex cursor-pointer items-center gap-2 border border-line bg-white px-3 py-2 text-sm"
      >
        <input
          type="radio"
          id={`${naam}-ander`}
          name={naam}
          className="shrink-0"
          checked={anderModus}
          onChange={() => {
            setAnderModus(true);
            onKies("");
          }}
        />
        <span className="font-semibold text-ink">Ander adres (zelf invullen)</span>
      </label>

      {anderModus && (
        <input
          type="text"
          value={waarde}
          autoFocus
          onChange={(e) => onKies(e.target.value)}
          placeholder="Straat, postcode, plaats"
          className="min-h-[44px] w-full rounded-none border border-line bg-white px-3 text-base text-ink focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent"
        />
      )}
    </fieldset>
  );
}
