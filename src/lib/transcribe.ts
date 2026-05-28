import { env } from "./env";

const WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";

export interface TranscribeConfig {
  apiKey: string;
}

export interface Transcriber {
  transcribe(audio: Buffer, contentType: string): Promise<string>;
}

export function createTranscriber(config: TranscribeConfig): Transcriber {
  return {
    async transcribe(audio: Buffer, contentType: string) {
      const fd = new FormData();
      fd.append("file", new Blob([new Uint8Array(audio)], { type: contentType }), "audio.webm");
      fd.append("model", "whisper-1");
      fd.append("language", "nl");

      const res = await fetch(WHISPER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${config.apiKey}` },
        body: fd,
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Whisper-fout (${res.status}): ${txt}`);
      }

      const data = (await res.json()) as { text?: unknown };
      return typeof data.text === "string" ? data.text.trim() : "";
    },
  };
}

let cached: Transcriber | null = null;

export function transcriber(): Transcriber {
  if (!cached) cached = createTranscriber({ apiKey: env().OPENAI_API_KEY });
  return cached;
}
