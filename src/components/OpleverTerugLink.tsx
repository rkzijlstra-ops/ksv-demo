"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useOpleverUpload } from "@/lib/oplever-upload-status";

/**
 * Terug-knop op de oplever-pagina. Staat buiten OpleverFlow (in de server-pagina), maar moet wél
 * waarschuwen als er nog een upload loopt: vandaar dit kleine client-component dat de gedeelde
 * upload-status leest. Wat al klaar is staat veilig in het concept; alleen de lopende upload stopt.
 */
export function OpleverTerugLink({ href }: { href: string }) {
  const { ietsBezig } = useOpleverUpload();
  return (
    <Link
      href={href}
      onClick={(e) => {
        if (
          ietsBezig &&
          !window.confirm(
            "Er wordt nog iets geüpload. Wat al klaar is blijft bewaard, maar de lopende upload stopt als je teruggaat. Toch teruggaan?",
          )
        ) {
          e.preventDefault();
        }
      }}
      className="inline-flex min-h-[44px] items-center gap-1.5 border-2 border-primary px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-primary hover:bg-surface"
    >
      <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
      Terug
    </Link>
  );
}
