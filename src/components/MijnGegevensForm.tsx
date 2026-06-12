"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { normaliseerNlMobiel } from "@/lib/telefoon";

/**
 * Formulier waarmee een gebruiker zijn eigen afzender-gegevens voor het opleverrapport bijwerkt
 * (bedrijfsnaam, telefoon, contact-mail). Naam staat vast (door kantoor ingevoerd), hier alleen lezen.
 * Voor een monteur staan hier ook de SMS-voorkeuren.
 */
export function MijnGegevensForm({
  naam,
  bedrijfsnaam,
  telefoon,
  contactEmail,
  isMonteur = false,
  smsWerkKritiek = true,
  smsOverig = true,
  waarschuwKlantZicht = true,
}: {
  naam: string;
  bedrijfsnaam: string | null;
  telefoon: string | null;
  contactEmail: string | null;
  isMonteur?: boolean;
  smsWerkKritiek?: boolean;
  smsOverig?: boolean;
  waarschuwKlantZicht?: boolean;
}) {
  const router = useRouter();
  const [velden, setVelden] = useState({
    naam: naam ?? "",
    bedrijfsnaam: bedrijfsnaam ?? "",
    telefoon: telefoon ?? "",
    contact_email: contactEmail ?? "",
    sms_werk_kritiek: smsWerkKritiek,
    sms_overig: smsOverig,
    waarschuw_klant_zicht: waarschuwKlantZicht,
  });
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState("");

  const nummerGeldig = normaliseerNlMobiel(velden.telefoon) !== null;

  function zet(veld: "naam" | "bedrijfsnaam" | "telefoon" | "contact_email", waarde: string) {
    setVelden((v) => ({ ...v, [veld]: waarde }));
    setKlaar(false);
  }

  function zetBool(
    veld: "sms_werk_kritiek" | "sms_overig" | "waarschuw_klant_zicht",
    waarde: boolean,
  ) {
    setVelden((v) => ({ ...v, [veld]: waarde }));
    setKlaar(false);
  }

  async function opslaan() {
    setBezig(true);
    setFout("");
    setKlaar(false);
    try {
      const res = await fetch("/api/mijn-gegevens", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(velden),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? `Opslaan mislukt (${res.status})`);
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

  const labelClass = "flex flex-col gap-1 text-sm font-semibold text-ink";
  const inputClass =
    "min-h-[44px] border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  return (
    <div className="flex flex-col gap-4">
      <label className={labelClass}>
        Naam
        <input
          className={inputClass}
          value={velden.naam}
          onChange={(e) => zet("naam", e.target.value)}
          placeholder="Bijv. Piet de Vries"
        />
        <span className="text-xs font-normal text-ink-muted">
          Zoals je op het rapport wilt staan. Kantoor heeft een naam ingevuld; vul hem hier gerust aan.
        </span>
      </label>

      <label className={labelClass}>
        Bedrijfsnaam
        <input
          className={inputClass}
          value={velden.bedrijfsnaam}
          onChange={(e) => zet("bedrijfsnaam", e.target.value)}
          placeholder="Bijv. BKM Keukenmontage"
        />
      </label>

      <label className={labelClass}>
        Telefoon
        <input
          className={inputClass}
          value={velden.telefoon}
          onChange={(e) => zet("telefoon", e.target.value)}
          inputMode="tel"
          placeholder="Bijv. 06-12345678"
        />
        <span className="text-xs font-normal text-ink-muted">
          Dit nummer gebruiken we voor SMS-meldingen.
        </span>
      </label>

      {isMonteur && (
        <fieldset className="flex flex-col gap-3 border-2 border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">SMS-meldingen</legend>
          {!nummerGeldig && (
            <p className="text-xs text-ink-muted">Vul je mobiele nummer in om SMS aan te zetten.</p>
          )}
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Werk-kritiek
              <span className="block text-xs font-normal text-ink-muted">
                Nieuwe of gewijzigde klus, annulering, klus weggehaald.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={velden.sms_werk_kritiek}
              disabled={!nummerGeldig}
              onChange={(e) => zetBool("sms_werk_kritiek", e.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Herinneringen en overig
              <span className="block text-xs font-normal text-ink-muted">
                Bevestig-herinnering, nieuw document bij je klus.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={velden.sms_overig}
              disabled={!nummerGeldig}
              onChange={(e) => zetBool("sms_overig", e.target.checked)}
            />
          </label>
        </fieldset>
      )}

      {isMonteur && (
        <fieldset className="flex flex-col gap-3 border-2 border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">Privacy bij versturen</legend>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>
              Waarschuw bij versturen naar de klant
              <span className="block text-xs font-normal text-ink-muted">
                De klant ziet alle foto&apos;s en meldingen, niet alleen je opmerking. Zet je dit aan, dan
                vraagt de app om bevestiging voor je naar de klant stuurt.
              </span>
            </span>
            <input
              type="checkbox"
              className="h-6 w-6"
              checked={velden.waarschuw_klant_zicht}
              onChange={(e) => zetBool("waarschuw_klant_zicht", e.target.checked)}
            />
          </label>
        </fieldset>
      )}

      <label className={labelClass}>
        Contact-e-mail
        <input
          className={inputClass}
          value={velden.contact_email}
          onChange={(e) => zet("contact_email", e.target.value)}
          inputMode="email"
          placeholder="Bijv. jouw@bedrijf.nl"
        />
      </label>

      <p className="text-xs text-ink-muted">
        Deze gegevens komen op je opleverrapporten te staan (briefhoofd en voetregel). Laat je een veld
        leeg, dan blijft het gewoon weg.
      </p>

      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={16} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}

      <button
        type="button"
        onClick={opslaan}
        disabled={bezig}
        className="inline-flex min-h-[48px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:opacity-60"
      >
        {bezig && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
        {klaar && !bezig && <Check size={16} strokeWidth={2.5} aria-hidden="true" />}
        {klaar && !bezig ? "Opgeslagen" : "Opslaan"}
      </button>
    </div>
  );
}
