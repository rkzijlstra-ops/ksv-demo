"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, X, Check, CheckCircle2, AlertCircle } from "lucide-react";

/**
 * Schermvullend teken-venster voor de klant-handtekening (idee B). Bovenin een balk met waar de klant
 * voor tekent (Akkoord / Niet akkoord) plus de actieknoppen; daaronder het tekenvlak. Zo legt de klant
 * in één scherm zowel de uitkomst als de handtekening vast. Werkt het prettigst in landschap.
 * `onOpslaan` geeft de PNG-dataURL terug, `onSluiten` annuleert zonder op te slaan, `akkoord`/`setAkkoord`
 * delen de controle-uitkomst met de oplever-flow.
 */
export function HandtekeningModal({
  onOpslaan,
  onSluiten,
  akkoord,
  setAkkoord,
}: {
  onOpslaan: (dataUrl: string) => void;
  onSluiten: () => void;
  /** Controle-uitkomst: true = akkoord, false = niet akkoord, null = nog niet gekozen. */
  akkoord: boolean | null;
  setAkkoord: (v: boolean) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tekenen = useRef(false);
  const [leeg, setLeeg] = useState(true);

  // Tekenbuffer gelijk aan weergavegrootte: scherpe, onvervormde lijnen.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }, []);

  function positie(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = positie(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    tekenen.current = true;
    canvasRef.current!.setPointerCapture(e.pointerId);
  }

  function beweeg(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!tekenen.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
    const { x, y } = positie(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stop() {
    if (!tekenen.current) return;
    tekenen.current = false;
    setLeeg(false);
  }

  function wis() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setLeeg(true);
  }

  function opslaan() {
    if (leeg) return;
    onOpslaan(canvasRef.current!.toDataURL("image/png"));
  }

  return (
    <div className="fixed inset-0 z-[60] grid h-full grid-rows-[auto_minmax(0,1fr)_auto] bg-white landscape:grid-cols-[minmax(0,1fr)_minmax(168px,auto)] landscape:grid-rows-[1fr_1fr]">
      {/* Akkoord-groep: portret = bovenbalk (knoppen naast elkaar), landschap = rechtsboven (onder elkaar). */}
      <div className="border-b border-line p-3 landscape:col-start-2 landscape:row-start-1 landscape:flex landscape:flex-col landscape:justify-center landscape:border-b-0 landscape:border-l">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink">Klant tekent voor:</span>
          <button
            type="button"
            onClick={onSluiten}
            aria-label="Sluiten zonder opslaan"
            className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center text-ink-muted hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="flex gap-2 landscape:flex-col">
          <button
            type="button"
            onClick={() => setAkkoord(true)}
            aria-pressed={akkoord === true}
            className={`inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-none border-2 px-3 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent landscape:flex-none ${
              akkoord === true
                ? "border-success bg-success text-white"
                : "border-success bg-white text-success hover:bg-success/10"
            }`}
          >
            <CheckCircle2 size={18} strokeWidth={2.5} aria-hidden="true" />
            Akkoord
          </button>
          <button
            type="button"
            onClick={() => setAkkoord(false)}
            aria-pressed={akkoord === false}
            className={`inline-flex min-h-[48px] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-none border-2 px-3 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent landscape:flex-none ${
              akkoord === false
                ? "border-urgent-rood bg-urgent-rood text-white"
                : "border-urgent-rood bg-white text-urgent-rood hover:bg-urgent-rood/10"
            }`}
          >
            <AlertCircle size={18} strokeWidth={2.5} aria-hidden="true" />
            Niet akkoord
          </button>
        </div>
      </div>

      {/* Tekenvlak: portret = midden, landschap = links over de volle hoogte. */}
      <div className="flex min-h-0 flex-col p-3 landscape:col-start-1 landscape:row-span-2">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={beweeg}
          onPointerUp={stop}
          onPointerLeave={stop}
          className="min-h-0 w-full flex-1 touch-none rounded-none border border-line bg-white"
        />
        <p className="pt-1 text-center text-sm text-ink-muted">
          {leeg ? "Laat de klant hier tekenen" : "Tik op Klaar om op te slaan"}
        </p>
      </div>

      {/* Wissen/Klaar: portret = onderbalk, landschap = rechtsonder (onder elkaar). */}
      <div className="border-t border-line p-3 landscape:col-start-2 landscape:row-start-2 landscape:flex landscape:flex-col landscape:justify-center landscape:border-t-0 landscape:border-l">
        <div className="flex gap-2 landscape:flex-col">
          <button
            type="button"
            onClick={wis}
            className="inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-ink bg-white text-base font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent landscape:flex-none"
          >
            <Eraser size={20} strokeWidth={2.5} aria-hidden="true" />
            Wissen
          </button>
          <button
            type="button"
            onClick={opslaan}
            disabled={leeg}
            className="relative inline-flex min-h-[52px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none bg-primary text-base font-extrabold uppercase tracking-[0.04em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-[''] landscape:flex-none"
          >
            <Check size={20} strokeWidth={2.5} aria-hidden="true" />
            Klaar
          </button>
        </div>
      </div>
    </div>
  );
}
