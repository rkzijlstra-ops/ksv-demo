"use client";

import { useRouter } from "next/navigation";
import { PackageCheck, CloudOff } from "lucide-react";
import { useOfflineState } from "@/lib/use-offline-state";

/**
 * Start de oplever-flow voor een opdracht. Navigeert naar het oplever-scherm
 * (eindstaat-bewijs, optionele handtekening, versturen). Offline grijs ("netwerk nodig"),
 * want de hele oplever-flow vereist netwerk.
 */
export function OpleverKnop({
  opdrachtId,
  label = "Rapportage starten",
  accent = "oranje",
}: {
  opdrachtId: string;
  label?: string;
  /** oranje = standaard merk-accent; groen = voor "Opnieuw opleveren" op een opgeleverde opdracht. */
  accent?: "oranje" | "groen";
}) {
  const router = useRouter();
  const { online } = useOfflineState();

  return (
    <button
      type="button"
      onClick={() => router.push(`/opdracht/${opdrachtId}/opleveren`)}
      disabled={!online}
      className={`relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 bg-primary px-4 py-3 text-base font-bold uppercase tracking-[0.06em] text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-60 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:content-[''] ${accent === "groen" ? "after:bg-success" : "after:bg-accent"}`}
    >
      {!online ? (
        <>
          <CloudOff size={22} strokeWidth={2.5} aria-hidden="true" />
          Opleveren – netwerk nodig
        </>
      ) : (
        <>
          <PackageCheck size={22} strokeWidth={2.5} aria-hidden="true" />
          {label}
        </>
      )}
    </button>
  );
}
