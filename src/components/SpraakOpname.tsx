"use client";

import { useRef, useState } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";

type Status = "idle" | "opnemen" | "verwerken";

export function SpraakOpname({ onTekst }: { onTekst: (tekst: string) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [fout, setFout] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setFout("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = recorder.mimeType || "audio/webm";
        await verwerk(new Blob(chunksRef.current, { type }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setStatus("opnemen");
    } catch {
      setFout("Geen toegang tot microfoon. Typ je melding of sta toegang toe.");
    }
  }

  function stop() {
    recorderRef.current?.stop();
    setStatus("verwerken");
  }

  async function verwerk(blob: Blob) {
    try {
      const fd = new FormData();
      fd.append("audio", blob, "audio.webm");
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Transcriptie mislukt (${res.status})`);
      onTekst(body.tekst ?? "");
    } catch (err) {
      setFout((err as Error).message);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div>
      {status === "opnemen" ? (
        <button
          type="button"
          onClick={stop}
          className="flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-none bg-urgent-rood px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Square size={20} strokeWidth={3} className="animate-pulse" aria-hidden="true" />
          Stop opname
        </button>
      ) : (
        <button
          type="button"
          onClick={start}
          disabled={status === "verwerken"}
          className="flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-none border-2 border-primary bg-white px-4 py-3 text-base font-bold text-primary transition-colors duration-150 hover:bg-surface focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
        >
          {status === "verwerken" ? (
            <>
              <Loader2 size={20} className="animate-spin" aria-hidden="true" />
              Tekst verwerken…
            </>
          ) : (
            <>
              <Mic size={20} strokeWidth={2.5} aria-hidden="true" />
              Inspreken
            </>
          )}
        </button>
      )}

      {fout && (
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-urgent-rood">
          <AlertCircle size={18} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
          {fout}
        </p>
      )}
    </div>
  );
}
