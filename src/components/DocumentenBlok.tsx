"use client";

import { useState, type ReactNode } from "react";
import type { Document } from "@/lib/db";
import {
  documentSoort,
  documentGroep,
  GROEP_LABEL,
  type DocumentGroep,
} from "@/lib/document-weergave";
import { DocumentKaart } from "./DocumentKaart";
import { PdfViewer } from "./PdfViewer";
import { OfflineLaadKnop } from "./OfflineLaadKnop";

const GROEP_VOLGORDE: DocumentGroep[] = ["orderbon", "tekeningen", "overig"];

/**
 * Gedeeld documenten-blok voor monteur en kantoor: groepeert op soort (orderbon / tekeningen / overig),
 * bron-document bovenaan, opent documenten in de in-app viewer. `magOffline` toont de offline-knop
 * (alleen monteur). `actieVoorDoc` levert een extra knop per regel (bv. verwijderen bij kantoor).
 */
export function DocumentenBlok({
  documenten,
  magOffline = false,
  actieVoorDoc,
}: {
  documenten: Document[];
  magOffline?: boolean;
  actieVoorDoc?: (doc: Document) => ReactNode;
}) {
  const [open, setOpen] = useState<Document | null>(null);

  if (documenten.length === 0) {
    return (
      <p className="rounded-none border border-line bg-surface p-4 text-sm text-ink-muted">
        Geen documenten bij deze klus.
      </p>
    );
  }

  // Sorteren: bron eerst, dan nieuwste eerst.
  const gesorteerd = [...documenten].sort((a, b) => {
    if (a.is_primair !== b.is_primair) return a.is_primair ? -1 : 1;
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  });

  const perGroep = new Map<DocumentGroep, Document[]>();
  for (const doc of gesorteerd) {
    const groep = documentGroep(documentSoort(doc.bestandsnaam, doc.type));
    const lijst = perGroep.get(groep) ?? [];
    lijst.push(doc);
    perGroep.set(groep, lijst);
  }

  // Openen vanuit de tik: meteen echt-fullscreen waar de browser het ondersteunt (Android/desktop),
  // zoals een filmpje dat uitklapt. Op iPhone-Safari niet ondersteund; daar vult de overlay het scherm
  // (en in de geïnstalleerde PWA is dat sowieso schermvullend). Stil falen als het niet mag.
  function openen(doc: Document) {
    try {
      if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.();
    } catch {
      /* niet ondersteund: overlay vult het scherm */
    }
    setOpen(doc);
  }
  function sluiten() {
    try {
      if (document.fullscreenElement) void document.exitFullscreen?.();
    } catch {
      /* noop */
    }
    setOpen(null);
  }

  return (
    <div className="flex flex-col gap-4">
      {GROEP_VOLGORDE.filter((g) => perGroep.has(g)).map((groep) => (
        <div key={groep}>
          <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-muted">
            {GROEP_LABEL[groep]}
          </p>
          <div className="flex flex-col gap-2">
            {perGroep.get(groep)!.map((doc) => (
              <DocumentKaart key={doc.id} doc={doc} onOpen={openen} actie={actieVoorDoc?.(doc)} />
            ))}
          </div>
        </div>
      ))}

      {magOffline && <OfflineLaadKnop urls={gesorteerd.map((d) => d.publieke_url)} />}

      {open && (
        <PdfViewer
          url={open.publieke_url}
          bestandsnaam={open.bestandsnaam}
          type={open.type}
          onClose={sluiten}
        />
      )}
    </div>
  );
}
