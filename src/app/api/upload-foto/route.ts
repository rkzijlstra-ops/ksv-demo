import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";

const MAX_FOTO_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  let buffer: Buffer;
  let contentType: string;
  try {
    const formData = await req.formData();
    const file = formData.get("foto");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Veld 'foto' ontbreekt of is geen bestand" },
        { status: 400 },
      );
    }
    if (file.size > MAX_FOTO_BYTES) {
      return NextResponse.json(
        { error: `Foto te groot (${file.size} bytes, max ${MAX_FOTO_BYTES})` },
        { status: 413 },
      );
    }
    buffer = Buffer.from(await file.arrayBuffer());
    contentType = file.type || "image/jpeg";
  } catch (err) {
    return NextResponse.json(
      { error: `Kon foto niet lezen: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  try {
    const { url } = await storage().uploadFoto(buffer, contentType);
    return NextResponse.json({ url }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
