import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { valideerUploads, type UploadVerzoek } from "@/lib/upload-validatie";

export const runtime = "nodejs";

/**
 * Geeft per bestand een signed upload-URL terug, zodat de browser het document RECHTSTREEKS naar
 * Supabase Storage stuurt (buiten de Vercel-functie-payloadgrens om, die ~4,5 MB is). De server krijgt
 * daarna alleen de opslagpaden, nooit de zware bytes. Lost de 413 op bij grote/veel bestanden.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let body: { bestanden?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  const check = valideerUploads(body.bestanden);
  if (!check.ok) return NextResponse.json({ error: check.fout }, { status: 400 });

  const st = storage();
  try {
    const uploads = await Promise.all(
      (body.bestanden as UploadVerzoek[]).map(async (b) => {
        const { pad, token, publieke_url } = await st.signDocumentUpload(b.naam, b.type);
        return { naam: b.naam, type: b.type, pad, token, publieke_url };
      }),
    );
    return NextResponse.json({ uploads }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Upload voorbereiden mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
