"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Check, AlertCircle } from "lucide-react";

export function UitnodigForm() {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [telefoon, setTelefoon] = useState("");
  const [rol, setRol] = useState<"monteur" | "opdrachtgever">("monteur");
  const [bezig, setBezig] = useState(false);
  const [bericht, setBericht] = useState("");
  const [fout, setFout] = useState("");

  async function uitnodigen(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setBericht("");
    setFout("");
    try {
      const res = await fetch("/api/mensen/uitnodigen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam, email, rol, telefoon }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Uitnodigen mislukt (${res.status})`);
        return;
      }
      const mailDeel = body.mailVerstuurd
        ? `Uitnodigingsmail verstuurd naar ${email}.`
        : `De mail kon niet verstuurd worden, laat ${email} zelf inloggen op /login.`;
      const smsDeel = body.smsGevraagd
        ? body.smsVerstuurd
          ? " SMS-vangnet verstuurd."
          : " SMS kon niet verstuurd worden."
        : "";
      setBericht(`${naam} uitgenodigd. ${mailDeel}${smsDeel}`);
      setNaam("");
      setEmail("");
      setTelefoon("");
      setRol("monteur");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  const veld = "min-h-[48px] border-2 border-line bg-white px-3 text-base focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  return (
    <form onSubmit={uitnodigen} className="flex flex-col gap-3 border-2 border-ink bg-white p-4">
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Naam
        <input value={naam} onChange={(e) => setNaam(e.target.value)} required className={veld} placeholder="Bijv. Piet" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        E-mailadres
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className={veld}
          placeholder="piet@bedrijf.nl"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        06-nummer (aanbevolen)
        <input
          type="tel"
          inputMode="tel"
          value={telefoon}
          onChange={(e) => setTelefoon(e.target.value)}
          className={veld}
          placeholder="06 12345678"
        />
        <span className="text-xs font-normal text-ink-muted">
          Stuurt er een SMS bij, voor het geval de mail in de spam belandt. Optioneel.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-ink">
        Rol
        <select value={rol} onChange={(e) => setRol(e.target.value as "monteur" | "opdrachtgever")} className={veld}>
          <option value="monteur">Monteur</option>
          <option value="opdrachtgever">Opdrachtgever</option>
        </select>
      </label>
      <button
        type="submit"
        disabled={bezig || !naam.trim() || !email.trim()}
        className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-extrabold uppercase tracking-[0.05em] text-white disabled:opacity-60"
      >
        {bezig ? (
          <Loader2 size={20} className="animate-spin" aria-hidden="true" />
        ) : (
          <UserPlus size={20} strokeWidth={2.4} aria-hidden="true" />
        )}
        Uitnodigen
      </button>

      {bericht && (
        <p className="flex items-start gap-2 text-sm font-semibold text-success">
          <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {bericht}
        </p>
      )}
      {fout && (
        <p className="flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </form>
  );
}
