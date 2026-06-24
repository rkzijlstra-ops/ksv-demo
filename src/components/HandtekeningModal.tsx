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
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Akkoord-balk boven (idee B): waar tekent de klant voor + de actieknoppen. */}
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
        <span className="text-sm font-semibold text-ink">Klant tekent voor:</span>
        <button
          type="button"
          onClick={() => setAkkoord(true)}
          aria-pressed={akkoord === true}
          className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 border-2 px-4 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent ${
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
          className={`inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 border-2 px-4 text-sm font-extrabold uppercase tracking-[0.04em] focus-visible:outline-3 focus-visible:outline-accent ${
            akkoord === false
              ? "border-urgent-rood bg-urgent-rood text-white"
              : "border-urgent-rood bg-white text-urgent-rood hover:bg-urgent-rood/10"
          }`}
        >
          <AlertCircle size={18} strokeWidth={2.5} aria-hidden="true" />
          Niet akkoord
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={wis}
          className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-none border-2 border-ink bg-white px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          <Eraser size={18} strokeWidth={2.5} aria-hidden="true" />
          Wissen
        </button>
        <button
          type="button"
          onClick={opslaan}
          disabled={leeg}
          className="relative inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-none bg-primary px-5 text-sm font-extrabold uppercase tracking-[0.05em] text-white hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50 after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-accent after:content-['']"
        >
          <Check size={18} strokeWidth={2.5} aria-hidden="true" />
          Klaar
        </button>
        <button
          type="button"
          onClick={onSluiten}
          aria-label="Sluiten zonder opslaan"
          className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center text-ink-muted hover:bg-surface focus-visible:outline-3 focus-visible:outline-primary"
        >
          <X size={22} aria-hidden="true" />
        </button>
      </div>

      <div className="min-h-0 flex-1 p-3">
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={beweeg}
          onPointerUp={stop}
          onPointerLeave={stop}
          className="h-full w-full touch-none rounded-none border border-line bg-white"
        />
      </div>

      <p className="px-4 pb-2 text-center text-sm text-ink-muted">
        {leeg ? "Laat de klant hier tekenen" : "Tik op Klaar om op te slaan"}
      </p>
    </div>
  );
}
