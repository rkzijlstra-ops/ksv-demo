/**
 * Laadt pdfjs-dist lui in de browser en wijst de (gevendorde) worker aan in /public. Eén keer
 * geïnitialiseerd; de worker is lokaal zodat de viewer ook offline werkt. Alleen client-side gebruiken.
 */
type PdfjsModule = typeof import("pdfjs-dist");

let pdfjsPromise: Promise<PdfjsModule> | null = null;

export function getPdfjs(): Promise<PdfjsModule> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}
