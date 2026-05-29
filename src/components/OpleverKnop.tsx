"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PackageCheck, Loader2, AlertCircle } from "lucide-react";

export function OpleverKnop({
  opdrachtId,
  meldingCount,
}: {
  opdrachtId: string;
  meldingCount: number;
}) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState("");

  async function opleveren() {
    const vraag =
      meldingCount === 0
        ? "Er staan nog geen meldingen op deze opdracht. Toch opleveren met een leeg rapport?"
        : "Opdracht opleveren? Het rapport wordt gemaild en de opdracht gaat naar history.";
    if (!window.confirm(vraag)) return;

    setBezig(true);
    setFout("");
    try {
      const res = await fetch(`/api/opdrachten/${opdrachtId}/opleveren`, { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(body.error ?? `Opleveren mislukt (${res.status})`);
        return;
      }
      router.refresh();
    } catch {
      setFout("Netwerkfout, probeer opnieuw");
    } finally {
      setBezig(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={opleveren}
        disabled={bezig}
        className="flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {bezig ? (
          <>
            <Loader2 size={22} className="animate-spin" aria-hidden="true" />
            Opleveren…
          </>
        ) : (
          <>
            <PackageCheck size={22} strokeWidth={2.5} aria-hidden="true" />
            Opdracht opleveren
          </>
        )}
      </button>
      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
