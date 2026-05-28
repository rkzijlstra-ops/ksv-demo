import { NextResponse } from "next/server";
import { transcriber } from "@/lib/transcribe";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // Whisper-limiet

export async function POST(req: Request) {
  let buffer: Buffer;
  let contentType: string;
  try {
    const formData = await req.formData();
    const file = formData.get("audio");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Veld 'audio' ontbreekt of is geen bestand" },
        { status: 400 },
      );
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio te groot (${file.size} bytes, max ${MAX_AUDIO_BYTES})` },
        { status: 413 },
      );
    }
    buffer = Buffer.from(await file.arrayBuffer());
    contentType = file.type || "audio/webm";
  } catch (err) {
    return NextResponse.json(
      { error: `Kon audio niet lezen: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    const tekst = await transcriber().transcribe(buffer, contentType);
    return NextResponse.json({ tekst }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Transcriptie mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }
}
