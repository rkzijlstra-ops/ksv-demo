import { NextResponse } from "next/server";
import { parsePdfWithClaude } from "@/lib/claude-client";
import { db } from "@/lib/db";

const MAX_PDF_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  let buffer: Buffer;
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Veld 'file' ontbreekt of is geen bestand" },
        { status: 400 },
      );
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json(
        { error: `PDF te groot (${file.size} bytes, max ${MAX_PDF_BYTES})` },
        { status: 413 },
      );
    }
    buffer = Buffer.from(await file.arrayBuffer());
  } catch (err) {
    return NextResponse.json(
      { error: `Kon multipart niet lezen: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = await parsePdfWithClaude(buffer);
  } catch (err) {
    return NextResponse.json(
      { error: `Claude-parsing mislukt: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let id: string;
  try {
    const result = await (await db()).insertPdfMelding(parsed);
    id = result.id;
  } catch (err) {
    return NextResponse.json(
      { error: `DB-insert mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  return NextResponse.json({ id, ...parsed }, { status: 200 });
}
