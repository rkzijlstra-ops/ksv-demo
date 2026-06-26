"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle, ExternalLink, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { getPdfjs } from "@/lib/pdf-client";

/**
 * In-app viewer: opent een PDF (of afbeelding) in een overlay over de app, zodat de monteur de app
 * niet verlaat. Paginanavigatie, zoom, en hij onthoudt de laatst bekeken pagina per document
 * (localStorage). Werkt met de offline-cache omdat de worker lokaal staat.
 */
export function PdfViewer({
  url,
  bestandsnaam,
  type,
  onClose,
}: {
  url: string;
  bestandsnaam: string;
  type: "pdf" | "afbeelding";
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [volledig, setVolledig] = useState(false);
  const [kanVolledig, setKanVolledig] = useState(false);
  // pdfjs PDFDocumentProxy; los getypeerd om de pdfjs-types niet door de hele app te trekken.
  const pdfRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);
  const paginaKey = `pdfpag:${url}`;

  const [numPages, setNumPages] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState("");

  // Esc sluit; achtergrond niet scrollen zolang de viewer open is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const vorigeOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = vorigeOverflow;
    };
  }, [onClose]);

  // Echt-fullscreen (zoals een filmpje uitklappen): alleen tonen als de browser het ondersteunt.
  useEffect(() => {
    setKanVolledig(typeof document !== "undefined" && !!document.fullscreenEnabled);
    const onFs = () => setVolledig(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleVolledig = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.();
  }, []);

  // PDF laden (alleen voor type pdf).
  useEffect(() => {
    if (type !== "pdf") return;
    let afgebroken = false;
    setBezig(true);
    setFout("");
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const taak = pdfjs.getDocument({ url });
        const pdf = await taak.promise;
        if (afgebroken) return;
        pdfRef.current = pdf as unknown as typeof pdfRef.current;
        setNumPages(pdf.numPages);
        const onthouden = Number(localStorage.getItem(paginaKey) ?? "1");
        setPagina(onthouden >= 1 && onthouden <= pdf.numPages ? onthouden : 1);
      } catch {
        if (!afgebroken) setFout("Kon de PDF niet laden. Probeer hem extern te openen.");
      } finally {
        if (!afgebroken) setBezig(false);
      }
    })();
    return () => {
      afgebroken = true;
    };
  }, [url, type, paginaKey]);

  // Een pagina renderen naar het canvas, passend op de breedte, maal de zoom.
  const renderPagina = useCallback(async () => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdf || !canvas || !container) return;
    try {
      const page = (await pdf.getPage(pagina)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
      };
      const basis = page.getViewport({ scale: 1 });
      const beschikbaar = container.clientWidth - 16;
      const cssSchaal = (beschikbaar / basis.width) * zoom;
      // Scherp op retina/telefoon: render op de echte schermdichtheid en toon op CSS-formaat.
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = page.getViewport({ scale: cssSchaal * dpr });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
      canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch {
      setFout("Kon deze pagina niet tonen.");
    }
  }, [pagina, zoom]);

  useEffect(() => {
    if (type === "pdf" && !bezig && !fout) void renderPagina();
  }, [type, bezig, fout, renderPagina]);

  useEffect(() => {
    if (type === "pdf" && pagina) localStorage.setItem(paginaKey, String(pagina));
  }, [type, pagina, paginaKey]);

  const vorige = () => setPagina((p) => Math.max(1, p - 1));
  const volgende = () => setPagina((p) => Math.min(numPages || 1, p + 1));

  return (
    <div ref={wrapRef} className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={bestandsnaam}>
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)]">
        {/* kop */}
        <div className="flex items-center gap-2 border-b-2 border-line px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">{bestandsnaam}</span>
          {type === "pdf" && numPages > 0 && (
            <span className="shrink-0 font-mono text-xs text-ink-muted">pag. {pagina} / {numPages}</span>
          )}
          {kanVolledig && (
            <button
              type="button"
              onClick={toggleVolledig}
              aria-label={volledig ? "Verklein" : "Volledig scherm"}
              className="grid h-9 w-9 shrink-0 place-items-center border-[1.5px] border-line text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
            >
              {volledig ? (
                <Minimize2 size={18} strokeWidth={2.5} aria-hidden="true" />
              ) : (
                <Maximize2 size={18} strokeWidth={2.5} aria-hidden="true" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="grid h-9 w-9 shrink-0 place-items-center border-[1.5px] border-line text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
          >
            <X size={18} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>

        {/* inhoud */}
        <div ref={containerRef} className="relative flex-1 overflow-auto bg-surface p-2">
          {bezig && (
            <div className="absolute inset-0 grid place-items-center text-ink-muted">
              <Loader2 size={28} className="animate-spin" aria-hidden="true" />
            </div>
          )}
          {fout && (
            <div className="absolute inset-0 grid place-items-center p-6">
              <div className="flex max-w-xs flex-col items-center gap-3 text-center">
                <AlertCircle size={28} className="text-urgent-rood" aria-hidden="true" />
                <p className="text-sm font-semibold text-ink">{fout}</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 border-2 border-primary bg-white px-3 py-2 text-sm font-extrabold uppercase tracking-[0.03em] text-primary hover:bg-surface"
                >
                  <ExternalLink size={16} aria-hidden="true" /> Extern openen
                </a>
              </div>
            </div>
          )}
          {!fout && type === "afbeelding" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={url}
              alt={bestandsnaam}
              onLoad={() => setBezig(false)}
              onError={() => {
                setBezig(false);
                setFout("Kon de afbeelding niet laden.");
              }}
              className="mx-auto"
              style={{ width: `${zoom * 100}%`, maxWidth: zoom <= 1 ? "100%" : "none", height: "auto" }}
            />
          )}
          {!fout && type === "pdf" && <canvas ref={canvasRef} className="mx-auto block bg-white shadow" />}
        </div>

        {/* onderbalk */}
        <div className="flex items-center justify-between gap-2 border-t-2 border-line px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
          <div className="flex gap-2">
            {type === "pdf" && (
              <>
                <button type="button" onClick={vorige} disabled={pagina <= 1} aria-label="Vorige pagina"
                  className="grid h-9 w-10 place-items-center border-2 border-primary bg-white text-primary disabled:opacity-40 hover:bg-surface">
                  <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
                <button type="button" onClick={volgende} disabled={numPages > 0 && pagina >= numPages} aria-label="Volgende pagina"
                  className="grid h-9 w-10 place-items-center border-2 border-primary bg-white text-primary disabled:opacity-40 hover:bg-surface">
                  <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))} aria-label="Uitzoomen"
              className="grid h-9 w-10 place-items-center border-2 border-primary bg-white text-primary hover:bg-surface">
              <ZoomOut size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))} aria-label="Inzoomen"
              className="grid h-9 w-10 place-items-center border-2 border-primary bg-white text-primary hover:bg-surface">
              <ZoomIn size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
