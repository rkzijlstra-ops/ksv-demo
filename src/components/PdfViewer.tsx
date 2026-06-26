"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { getPdfjs } from "@/lib/pdf-client";

/**
 * In-app viewer: opent een PDF (of afbeelding) in een overlay over de app, zodat de monteur de app niet
 * verlaat. Bediening als de native viewer: KNIJP-ZOOMEN met twee vingers, SLEPEN met één vinger om naar
 * een ander stuk te bewegen. Paginanavigatie voor meerpagina-PDF's; onthoudt de laatst bekeken pagina.
 */
type Punt = { x: number; y: number };

function afstand(a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) {
  return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}
function klem(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

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
  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);
  const renderTaskRef = useRef<{ promise: Promise<void>; cancel: () => void } | null>(null);
  const paginaKey = `pdfpag:${url}`;

  const [numPages, setNumPages] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState("");

  // Zoom + verschuiving (transform). Refs lopen mee zodat de touch-handlers de actuele waarde lezen.
  const [schaal, setSchaal] = useState(1);
  const [pan, setPan] = useState<Punt>({ x: 0, y: 0 });
  const schaalRef = useRef(1);
  const panRef = useRef<Punt>({ x: 0, y: 0 });
  useEffect(() => {
    schaalRef.current = schaal;
  }, [schaal]);
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Gebaar-toestand (niet in state: verandert per touchmove).
  const gebaar = useRef({ startDist: 0, startSchaal: 1, startPan: { x: 0, y: 0 }, startTouch: { x: 0, y: 0 } });

  // Esc sluit; achtergrond niet scrollen zolang de viewer open is.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const vorige = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = vorige;
    };
  }, [onClose]);

  // PDF laden.
  useEffect(() => {
    if (type !== "pdf") return;
    let af = false;
    setBezig(true);
    setFout("");
    (async () => {
      try {
        const pdfjs = await getPdfjs();
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (af) return;
        pdfRef.current = pdf as unknown as typeof pdfRef.current;
        setNumPages(pdf.numPages);
        const onthouden = Number(localStorage.getItem(paginaKey) ?? "1");
        setPagina(onthouden >= 1 && onthouden <= pdf.numPages ? onthouden : 1);
      } catch {
        if (!af) setFout("Kon de PDF niet laden. Probeer hem extern te openen.");
      } finally {
        if (!af) setBezig(false);
      }
    })();
    return () => {
      af = true;
    };
  }, [url, type, paginaKey]);

  // Pagina renderen op breedte (groot), scherp op de schermdichtheid. Zoom gebeurt via de transform.
  const renderPagina = useCallback(async () => {
    const pdf = pdfRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!pdf || !canvas || !container) return;
    try {
      const page = (await pdf.getPage(pagina)) as {
        getViewport: (o: { scale: number }) => { width: number; height: number };
        render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void };
      };
      const basis = page.getViewport({ scale: 1 });
      const bw = container.clientWidth - 16;
      if (bw <= 0) return;
      const fit = bw / basis.width;
      // Backing-store ruimer dan de weergave, zodat knijp-zoomen scherp blijft (tot ~3x).
      const kwaliteit = Math.min(Math.max(window.devicePixelRatio || 1, 2.5), 3);
      const viewport = page.getViewport({ scale: fit * kwaliteit });
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      canvas.style.width = `${Math.floor(bw)}px`;
      canvas.style.height = `${Math.floor(bw * (basis.height / basis.width))}px`;
      renderTaskRef.current?.cancel();
      const taak = page.render({ canvasContext: ctx, viewport });
      renderTaskRef.current = taak;
      await taak.promise;
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "RenderingCancelledException") return;
      setFout("Kon deze pagina niet tonen.");
    }
  }, [pagina]);

  useEffect(() => {
    if (type === "pdf" && !bezig && !fout) void renderPagina();
  }, [type, bezig, fout, renderPagina]);

  // Bij draaien/resize (BREEDTE-wijziging) opnieuw passend renderen; zoom/pan terug naar begin. Alleen
  // op breedte, zodat het in/uit schuiven van de browserbalk (hoogte) de zoom niet reset.
  useEffect(() => {
    const el = containerRef.current;
    if (!el || type !== "pdf") return;
    let laatsteBreedte = el.clientWidth;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === laatsteBreedte) return;
      laatsteBreedte = w;
      setSchaal(1);
      setPan({ x: 0, y: 0 });
      if (!bezig && !fout) void renderPagina();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [type, bezig, fout, renderPagina]);

  // Laatst bekeken pagina onthouden.
  useEffect(() => {
    if (type === "pdf" && pagina) localStorage.setItem(paginaKey, String(pagina));
  }, [type, pagina, paginaKey]);

  // Pan begrenzen zodat je het beeld niet helemaal kwijtraakt.
  const klemPan = useCallback((p: Punt, s: number): Punt => {
    const container = containerRef.current;
    const media = type === "pdf" ? canvasRef.current : imgRef.current;
    if (!container || !media) return p;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const mw = (media as HTMLElement).offsetWidth * s;
    const mh = (media as HTMLElement).offsetHeight * s;
    const maxX = Math.max(0, (mw - cw) / 2);
    const maxY = Math.max(0, (mh - ch) / 2);
    return { x: klem(p.x, -maxX, maxX), y: klem(p.y, -maxY, maxY) };
  }, [type]);

  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      gebaar.current.startDist = afstand(e.touches[0], e.touches[1]);
      gebaar.current.startSchaal = schaalRef.current;
    } else if (e.touches.length === 1) {
      gebaar.current.startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      gebaar.current.startPan = panRef.current;
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && gebaar.current.startDist > 0) {
      const d = afstand(e.touches[0], e.touches[1]);
      const ns = klem((gebaar.current.startSchaal * d) / gebaar.current.startDist, 1, 5);
      setSchaal(ns);
      setPan((p) => klemPan(p, ns));
    } else if (e.touches.length === 1) {
      const t = e.touches[0];
      const np = {
        x: gebaar.current.startPan.x + (t.clientX - gebaar.current.startTouch.x),
        y: gebaar.current.startPan.y + (t.clientY - gebaar.current.startTouch.y),
      };
      setPan(klemPan(np, schaalRef.current));
    }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (e.touches.length === 0 && schaalRef.current <= 1) setPan({ x: 0, y: 0 });
  }
  // Desktop: dubbelklik wisselt tussen 1x en 2x.
  function onDoubleClick() {
    const ns = schaalRef.current > 1 ? 1 : 2;
    setSchaal(ns);
    setPan((p) => (ns <= 1 ? { x: 0, y: 0 } : klemPan(p, ns)));
  }

  const naarPagina = (volgende: boolean) => {
    setSchaal(1);
    setPan({ x: 0, y: 0 });
    setPagina((p) => (volgende ? Math.min(numPages || 1, p + 1) : Math.max(1, p - 1)));
  };
  const vorige = () => naarPagina(false);
  const volgende = () => naarPagina(true);

  const transform = `translate(${pan.x}px, ${pan.y}px) scale(${schaal})`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={bestandsnaam}>
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)]">
        {/* kop */}
        <div className="flex items-center gap-2 border-b-2 border-line px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">{bestandsnaam}</span>
          {type === "pdf" && numPages > 0 && (
            <span className="shrink-0 font-mono text-xs text-ink-muted">pag. {pagina} / {numPages}</span>
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

        {/* inhoud: knijp-zoomen + slepen */}
        <div
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onDoubleClick={onDoubleClick}
          className="relative flex-1 select-none overflow-hidden bg-surface p-2"
          style={{ touchAction: "none" }}
        >
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
          {!fout && (
            <div className="flex min-h-full min-w-full items-start justify-center">
              <div style={{ transform, transformOrigin: "center center" }}>
                {type === "afbeelding" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    ref={imgRef}
                    src={url}
                    alt={bestandsnaam}
                    onLoad={() => setBezig(false)}
                    onError={() => {
                      setBezig(false);
                      setFout("Kon de afbeelding niet laden.");
                    }}
                    className="block max-w-full"
                  />
                ) : (
                  <canvas ref={canvasRef} className="block bg-white shadow" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* onderbalk: alleen paginanavigatie (zoom = knijpen) */}
        {type === "pdf" && numPages > 1 && (
          <div className="flex items-center justify-center gap-3 border-t-2 border-line px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
            <button type="button" onClick={vorige} disabled={pagina <= 1} aria-label="Vorige pagina"
              className="grid h-10 w-12 place-items-center border-2 border-primary bg-white text-primary disabled:opacity-40 hover:bg-surface">
              <ChevronLeft size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>
            <span className="font-mono text-xs text-ink-muted">{pagina} / {numPages}</span>
            <button type="button" onClick={volgende} disabled={pagina >= numPages} aria-label="Volgende pagina"
              className="grid h-10 w-12 place-items-center border-2 border-primary bg-white text-primary disabled:opacity-40 hover:bg-surface">
              <ChevronRight size={20} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
