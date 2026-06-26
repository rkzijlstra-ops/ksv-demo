"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { getPdfjs } from "@/lib/pdf-client";

/**
 * In-app viewer: opent een PDF (alle pagina's onder elkaar) of een afbeelding in een overlay over de
 * app. Bediening als de native viewer: gewoon naar beneden SCROLLEN door alle pagina's, en KNIJP-ZOOMEN
 * met twee vingers (daarna scroll je in beide richtingen). Je verlaat de app niet.
 */
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const pdfRef = useRef<{ numPages: number; getPage: (n: number) => Promise<unknown> } | null>(null);
  const taakRef = useRef<{ promise: Promise<void>; cancel: () => void } | null>(null);
  const tokenRef = useRef(0);
  const cssWRef = useRef(0);
  const aspectRef = useRef<number[]>([]); // hoogte/breedte per pagina (of [0] voor de afbeelding)

  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState("");

  // Esc sluit; achtergrond niet scrollen.
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

  // Weergavemaat van alle media toepassen op basis van de zoom (CSS-grootte; de backing-store is hoog,
  // dus knijp-zoomen blijft scherp). Native scroll vangt het pannen op.
  const pasMaten = useCallback(() => {
    const cssW = cssWRef.current;
    if (cssW <= 0) return;
    const z = zoomRef.current;
    if (type === "pdf") {
      canvasRefs.current.forEach((c, i) => {
        if (!c) return;
        const a = aspectRef.current[i] || 1.414;
        c.style.width = `${Math.round(cssW * z)}px`;
        c.style.height = `${Math.round(cssW * z * a)}px`;
      });
    } else if (imgRef.current) {
      const a = aspectRef.current[0] || 1;
      imgRef.current.style.width = `${Math.round(cssW * z)}px`;
      imgRef.current.style.height = `${Math.round(cssW * z * a)}px`;
    }
  }, [type]);

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
      } catch {
        if (!af) {
          setFout("Kon de PDF niet laden. Probeer hem extern te openen.");
          setBezig(false);
        }
      }
    })();
    return () => {
      af = true;
    };
  }, [url, type]);

  // Alle pagina's renderen (scherp op hoge resolutie). Bij weinig pagina's hogere kwaliteit.
  const renderAlles = useCallback(async () => {
    const pdf = pdfRef.current;
    const container = containerRef.current;
    if (!pdf || !container) return;
    const cssW = container.clientWidth - 16;
    if (cssW <= 0) return;
    cssWRef.current = cssW;
    // Render op de resolutie die bij de HUIDIGE zoom hoort (scherp tot diep inzoomen). Bij veel pagina's
    // de bovengrens lager houden voor het geheugen.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const maxScale = pdf.numPages <= 2 ? 6 : 3.5;
    const renderScale = klem(zoomRef.current * dpr, 3, maxScale);
    const token = ++tokenRef.current;
    taakRef.current?.cancel();
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = (await pdf.getPage(i)) as {
          getViewport: (o: { scale: number }) => { width: number; height: number };
          render: (o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void>; cancel: () => void };
        };
        if (token !== tokenRef.current) return;
        const basis = page.getViewport({ scale: 1 });
        aspectRef.current[i - 1] = basis.height / basis.width;
        const canvas = canvasRefs.current[i - 1];
        if (!canvas) continue;
        const vp = page.getViewport({ scale: (cssW / basis.width) * renderScale });
        const ctx = canvas.getContext("2d");
        if (!ctx) continue;
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        taakRef.current = page.render({ canvasContext: ctx, viewport: vp });
        await taakRef.current.promise;
        if (token !== tokenRef.current) return;
        pasMaten();
      }
      setBezig(false);
    } catch (e) {
      if ((e as { name?: string } | null)?.name === "RenderingCancelledException") return;
      setFout("Kon de PDF niet tonen.");
      setBezig(false);
    }
  }, [pasMaten]);

  useEffect(() => {
    if (type === "pdf" && numPages > 0) void renderAlles();
  }, [type, numPages, renderAlles]);

  // Bij draaien (breedte-wijziging): zoom terug + opnieuw renderen.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let laatsteBreedte = el.clientWidth;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w === laatsteBreedte) return;
      laatsteBreedte = w;
      setZoom(1);
      if (type === "pdf") {
        void renderAlles();
      } else {
        cssWRef.current = el.clientWidth - 16;
        pasMaten();
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [type, renderAlles, pasMaten]);

  // Zoom toepassen op de weergavemaat (live, vloeiend).
  useEffect(() => {
    pasMaten();
  }, [zoom, numPages, pasMaten]);

  // Na het zoomen (kort wachten tot je stopt) opnieuw renderen op hogere resolutie -> scherp bij diep
  // inzoomen, zonder vooraf alles op extreme resolutie te zetten.
  useEffect(() => {
    if (type !== "pdf" || numPages === 0) return;
    const t = setTimeout(() => void renderAlles(), 220);
    return () => clearTimeout(t);
  }, [zoom, type, numPages, renderAlles]);

  // Knijp-zoomen (twee vingers). Eén vinger = native scrollen (touch-action pan-x pan-y).
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let startDist = 0;
    let startZoom = 1;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = afstand(e.touches[0], e.touches[1]);
        startZoom = zoomRef.current;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        const d = afstand(e.touches[0], e.touches[1]);
        setZoom(klem((startZoom * d) / startDist, 1, 4));
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) startDist = 0;
    };
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const dubbel = () => setZoom((z) => (z > 1 ? 1 : 2));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" role="dialog" aria-modal="true" aria-label={bestandsnaam}>
      <div className="flex h-full w-full flex-1 flex-col overflow-hidden bg-white pt-[env(safe-area-inset-top)]">
        <div className="flex items-center gap-2 border-b-2 border-line px-3 py-2">
          <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">{bestandsnaam}</span>
          {type === "pdf" && numPages > 0 && (
            <span className="shrink-0 font-mono text-xs text-ink-muted">{numPages} pag.</span>
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

        <div
          ref={containerRef}
          onDoubleClick={dubbel}
          className="relative flex-1 select-none overflow-auto bg-surface"
          style={{ touchAction: "pan-x pan-y" }}
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
          {!fout && type === "pdf" && numPages > 0 && (
            <div className="flex w-max min-w-full flex-col items-center gap-3 p-2">
              {Array.from({ length: numPages }).map((_, i) => (
                <canvas
                  key={i}
                  ref={(el) => {
                    canvasRefs.current[i] = el;
                  }}
                  className="block bg-white shadow"
                />
              ))}
            </div>
          )}
          {!fout && type === "afbeelding" && (
            <div className="flex w-max min-w-full justify-center p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={url}
                alt={bestandsnaam}
                onLoad={(e) => {
                  const im = e.currentTarget;
                  aspectRef.current[0] = im.naturalHeight / im.naturalWidth || 1;
                  cssWRef.current = (containerRef.current?.clientWidth ?? 0) - 16;
                  pasMaten();
                  setBezig(false);
                }}
                onError={() => {
                  setBezig(false);
                  setFout("Kon de afbeelding niet laden.");
                }}
                className="block bg-white shadow"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
