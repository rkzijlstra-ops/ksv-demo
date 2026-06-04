"use client";

import { useEffect, useRef, useState } from "react";
import { Video, Square, X, AlertCircle, Loader2 } from "lucide-react";
import {
  VIDEO_OPNAME_CONSTRAINTS,
  VIDEO_BITS_PER_SECOND,
  kiesVideoMimeType,
} from "@/lib/video-opname";
import { videoExtensie } from "@/lib/oplever-upload";

type Status = "starten" | "klaar" | "opnemen" | "verwerken";

/**
 * In-app video-opname op 1080p met gecapte bitrate. Houdt het bestand klein
 * (~37 MB/min) zodat het betrouwbaar uploadt vanaf de telefoon. Levert de
 * opname als File af via onCapture; onAnnuleer sluit zonder op te slaan.
 */
export function VideoOpnemen({
  onCapture,
  onAnnuleer,
}: {
  onCapture: (file: File) => void;
  onAnnuleer: () => void;
}) {
  const [status, setStatus] = useState<Status>("starten");
  const [fout, setFout] = useState("");
  const [seconden, setSeconden] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const afgebrokenRef = useRef(false);

  function stopTimer() {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function cleanup() {
    stopTimer();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  // Camera starten zodra het component verschijnt.
  useEffect(() => {
    let geannuleerd = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(VIDEO_OPNAME_CONSTRAINTS);
        if (geannuleerd) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setStatus("klaar");
      } catch {
        setFout(
          "Geen toegang tot de camera. Sta camera en microfoon toe, of kies een video uit je galerij.",
        );
      }
    }
    void start();
    return () => {
      geannuleerd = true;
      afgebrokenRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startOpname() {
    const stream = streamRef.current;
    if (!stream) return;
    setFout("");
    setSeconden(0);
    chunksRef.current = [];
    afgebrokenRef.current = false;

    const mimeType = kiesVideoMimeType((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, {
      ...(mimeType ? { mimeType } : {}),
      videoBitsPerSecond: VIDEO_BITS_PER_SECOND,
    });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "video/mp4";
      const blob = new Blob(chunksRef.current, { type });
      cleanup();
      if (afgebrokenRef.current) return;
      const file = new File([blob], `opname.${videoExtensie("", type)}`, { type });
      onCapture(file);
    };
    recorder.start();
    recorderRef.current = recorder;
    setStatus("opnemen");
    timerRef.current = window.setInterval(() => setSeconden((s) => s + 1), 1000);
  }

  function stopOpname() {
    stopTimer();
    setStatus("verwerken");
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  function annuleer() {
    afgebrokenRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    cleanup();
    onAnnuleer();
  }

  const mmss = `${Math.floor(seconden / 60)}:${String(seconden % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-2 rounded-none border border-line bg-black p-2">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="max-h-72 w-full rounded-none bg-black object-contain"
      />

      {fout && (
        <p className="flex items-start gap-2 px-1 py-1 text-sm font-semibold text-white">
          <AlertCircle
            size={18}
            strokeWidth={2.5}
            className="mt-0.5 shrink-0 text-urgent-rood"
            aria-hidden="true"
          />
          {fout}
        </p>
      )}

      <div className="flex items-center gap-2">
        {status === "opnemen" ? (
          <button
            type="button"
            onClick={stopOpname}
            className="relative flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none bg-urgent-rood px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <span className="h-3 w-3 rounded-full bg-white animate-pulse" aria-hidden="true" />
            Stoppen {mmss}
            <Square size={20} strokeWidth={3} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={startOpname}
            disabled={status !== "klaar"}
            className="relative flex min-h-[56px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-none bg-primary px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "starten" ? (
              <>
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                Camera starten…
              </>
            ) : status === "verwerken" ? (
              <>
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                Verwerken…
              </>
            ) : (
              <>
                <Video size={20} strokeWidth={2.5} aria-hidden="true" />
                Opname starten
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={annuleer}
          aria-label="Annuleren"
          className="inline-flex min-h-[56px] w-14 shrink-0 cursor-pointer items-center justify-center rounded-none border-2 border-white/70 text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-accent"
        >
          <X size={20} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
