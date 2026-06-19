"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Smartphone, Loader2, Check, AlertCircle } from "lucide-react";

/**
 * Demo-only: de tester registreert het toestel waarop hij de demo-berichten wil ontvangen. Daarna komen
 * de "nieuwe klus"-SMS en de mails op zíjn 06/e-mail binnen, voor het echt. Vervangt het vaste testcontact.
 */
export function DemoRegistratie() {
  const router = useRouter();
  const [telefoon, setTelefoon] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "bezig" | "klaar">("idle");
  const [fout, setFout] = useState("");

  async function opslaan() {
    setStatus("bezig");
    setFout("");
    try {
      const res = await fetch("/api/demo/registreer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefoon: telefoon.trim() || null, email: email.trim() || null }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        setFout(b.error ?? "Opslaan mislukt");
        setStatus("idle");
        return;
      }
      setStatus("klaar");
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
      setStatus("idle");
    }
  }

  const veld = "min-h-[40px] border-2 border-line bg-white px-3 text-sm focus-visible:border-ink focus-visible:outline-3 focus-visible:outline-accent";

  return (
    <div className="border-2 border-ink bg-white p-3">
      <p className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
        <Smartphone size={15} strokeWidth={2.5} aria-hidden="true" />
        Op welk toestel wil je de demo-SMS en -mail ontvangen?
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <input className={`${veld} flex-[1_1_140px]`} inputMode="tel" placeholder="06-nummer" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} />
        <input className={`${veld} flex-[2_1_200px]`} inputMode="email" placeholder="e-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button
          type="button"
          onClick={opslaan}
          disabled={status === "bezig"}
          className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 bg-primary px-4 text-sm font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 disabled:opacity-60"
        >
          {status === "bezig" ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : status === "klaar" ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
          {status === "klaar" ? "Ingesteld" : "Instellen"}
        </button>
      </div>
      {status === "klaar" && (
        <p className="mt-1.5 text-xs text-ink-muted">
          Klaar. Plan nu een klus in en je krijgt de SMS/mail op je eigen toestel.
        </p>
      )}
      {fout && (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-urgent-rood">
          <AlertCircle size={14} strokeWidth={2.5} aria-hidden="true" /> {fout}
        </p>
      )}
    </div>
  );
}
