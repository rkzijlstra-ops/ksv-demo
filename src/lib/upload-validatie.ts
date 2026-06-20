export interface UploadVerzoek {
  naam: string;
  type: string;
  grootte?: number;
}

export const MAX_UPLOAD_AANTAL = 20;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB per bestand

/** Valideert een lijst upload-verzoeken (aantal, type, grootte) vóór er signed URLs worden gemaakt. */
export function valideerUploads(bestanden: unknown): { ok: boolean; fout?: string } {
  if (!Array.isArray(bestanden) || bestanden.length === 0) {
    return { ok: false, fout: "Geen bestanden opgegeven" };
  }
  if (bestanden.length > MAX_UPLOAD_AANTAL) {
    return { ok: false, fout: `Te veel bestanden tegelijk (max ${MAX_UPLOAD_AANTAL})` };
  }
  for (const b of bestanden as UploadVerzoek[]) {
    if (!b || typeof b.naam !== "string" || typeof b.type !== "string") {
      return { ok: false, fout: "Ongeldig bestand in de lijst" };
    }
    const isPdf = b.type === "application/pdf";
    const isAfbeelding = b.type.startsWith("image/");
    if (!isPdf && !isAfbeelding) {
      return { ok: false, fout: `Niet-ondersteund bestandstype: ${b.naam} (${b.type || "onbekend"})` };
    }
    if (typeof b.grootte === "number" && b.grootte > MAX_UPLOAD_BYTES) {
      return {
        ok: false,
        fout: `Bestand te groot: ${b.naam} (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB per bestand)`,
      };
    }
  }
  return { ok: true };
}
