"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, AlertCircle } from "lucide-react";

type Status = "idle" | "opnemen" | "verwerken";

// Web Audio AudioContext-helper voor de korte start/stop-beeps.
type WindowMetWebkit = Window & { webkitAudioContext?: typeof AudioContext };
let _audioCtx: AudioContext | null = null;
function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === "closed") {
    const w = window as WindowMetWebkit;
    const Ctor = window.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) throw new Error("Web Audio niet beschikbaar");
    _audioCtx = new Ctor();
  }
  return _audioCtx;
}

function beep(freq: number, durationMs = 90) {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") void ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(now + durationMs / 1000);
  } catch {
    // beeps zijn nice-to-have, niet kritisch
  }
}

/** Korte oplopende "ding" om start aan te kondigen. */
function startBeep() {
  beep(660, 80);
  window.setTimeout(() => beep(880, 100), 95);
}

/** Korte dalende "ding" om stop aan te kondigen. */
function stopBeep() {
  beep(880, 80);
  window.setTimeout(() => beep(440, 120), 95);
}

// Voice activity detection (VAD) instellingen
const STILTE_THRESHOLD = 0.012; // RMS-grens onder spraak
const STILTE_MAX_MS = 5000; // auto-stop na 5s stilte

export function SpraakOpname({ onTekst }: { onTekst: (tekst: string) => void }) {
  const [status, setStatus] = useState<Status>("idle");
  const [fout, setFout] = useState("");
  const [stilteMs, setStilteMs] = useState(0);
  const [amplitude, setAmplitude] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stilteStartRef = useRef<number | null>(null);
  const rafIdRef = useRef<number | null>(null);

  function cleanup() {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      /* ignore */
    }
    analyserRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      void audioCtxRef.current.close();
    }
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    stilteStartRef.current = null;
  }

  function vadLoop() {
    const an = analyserRef.current;
    if (!an) return;
    const buf = new Float32Array(an.fftSize);
    an.getFloatTimeDomainData(buf);
    let sumSq = 0;
    for (let i = 0; i < buf.length; i++) sumSq += buf[i] * buf[i];
    const rms = Math.sqrt(sumSq / buf.length);
    setAmplitude(rms);

    const now = performance.now();
    if (rms < STILTE_THRESHOLD) {
      if (stilteStartRef.current === null) stilteStartRef.current = now;
      const ms = now - stilteStartRef.current;
      setStilteMs(ms);
      if (ms >= STILTE_MAX_MS) {
        stop();
        return;
      }
    } else {
      stilteStartRef.current = null;
      if (stilteMs !== 0) setStilteMs(0);
    }
    rafIdRef.current = requestAnimationFrame(vadLoop);
  }

  async function start() {
    setFout("");
    setStilteMs(0);
    setAmplitude(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // Analyser voor VAD + amplitude-meter
      try {
        const w = window as WindowMetWebkit;
        const Ctor = window.AudioContext ?? w.webkitAudioContext;
        if (Ctor) {
          const ctx = new Ctor();
          const src = ctx.createMediaStreamSource(stream);
          const an = ctx.createAnalyser();
          an.fftSize = 1024;
          src.connect(an);
          audioCtxRef.current = ctx;
          analyserRef.current = an;
        }
      } catch {
        // Zonder VAD blijft handmatig stoppen wel werken.
      }

      // MediaRecorder met lagere bitrate voor spraak (kleinere upload)
      const recorder = new MediaRecorder(stream, { audioBitsPerSecond: 24000 });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const type = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        cleanup();
        stopBeep();
        await verwerk(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setStatus("opnemen");
      startBeep();
      if (analyserRef.current) rafIdRef.current = requestAnimationFrame(vadLoop);
    } catch {
      setFout("Geen toegang tot microfoon. Typ je melding of sta toegang toe.");
      cleanup();
    }
  }

  function stop() {
    if (recorderRef.current?.state === "recording") {
      recorderRef.current.stop();
    }
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

  useEffect(() => {
    return () => {
      cleanup();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stilteSecRest = Math.max(0, Math.ceil((STILTE_MAX_MS - stilteMs) / 1000));
  const lvl = Math.min(100, Math.max(0, amplitude * 1000));
  const stiltVoor = stilteMs > 1200;

  return (
    <div>
      {status === "opnemen" ? (
        <div>
          <button
            type="button"
            onClick={stop}
            className="relative flex min-h-[56px] w-full cursor-pointer items-center justify-center gap-2 rounded-none bg-urgent-rood px-4 py-3 text-base font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className="h-3 w-3 rounded-full bg-white animate-pulse"
              aria-hidden="true"
            />
            {stiltVoor ? `Stilte – auto-stop in ${stilteSecRest}s` : "Aan het luisteren"}
            <Square size={20} strokeWidth={3} aria-hidden="true" />
          </button>
          <div
            className="mt-1 h-1.5 w-full overflow-hidden bg-line"
            aria-hidden="true"
            role="presentation"
          >
            <div
              className="h-full bg-success transition-[width]"
              style={{ width: `${lvl}%`, transitionDuration: "60ms" }}
            />
          </div>
        </div>
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
