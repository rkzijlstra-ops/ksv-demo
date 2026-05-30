"use client";

import { useRef, useState } from "react";
import { Eraser } from "lucide-react";

/**
 * Eenvoudig handtekening-canvas. Roept `onChange` met een PNG-dataURL na elke streek,
 * of null na wissen. De ouder bepaalt of er getekend is.
 */
export function Handtekening({ onChange }: { onChange: (dataUrl: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tekenen = useRef(false);
  const [leeg, setLeeg] = useState(true);

  function positie(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
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
    onChange(canvasRef.current!.toDataURL("image/png"));
  }

  function wis() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setLeeg(true);
    onChange(null);
  }

  return (
    <div className="flex flex-col gap-2">
      <canvas
        ref={canvasRef}
        width={600}
        height={200}
        onPointerDown={start}
        onPointerMove={beweeg}
        onPointerUp={stop}
        onPointerLeave={stop}
        className="h-[200px] w-full touch-none rounded-none border border-line bg-white"
      />
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-muted">
          {leeg ? "Laat de klant hier tekenen" : "Handtekening gezet"}
        </span>
        <button
          type="button"
          onClick={wis}
          className="inline-flex min-h-[40px] cursor-pointer items-center gap-1 border border-ink px-3 text-sm font-extrabold uppercase tracking-[0.04em] text-ink hover:bg-surface focus-visible:outline-3 focus-visible:outline-accent"
        >
          <Eraser size={15} strokeWidth={2.5} aria-hidden="true" />
          Wissen
        </button>
      </div>
    </div>
  );
}
