import { NextResponse } from "next/server";
import { getAuthenticatedUserId } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { leesEnGroepeer, type InvoerBestand } from "@/lib/order-inlezen";

export const runtime = "nodejs";

interface PadItem {
  naam: string;
  type: string;
  pad: string;
  publieke_url?: string;
}

/**
 * Leest eerder-geüploade documenten (op opslagpad) server-side in en groepeert ze per klus. Geeft de
 * voorgestelde klussen (met velden + bijbehorende bestanden) terug, plus de ongegroepeerde bestanden.
 * De zware bytes komen uit storage, niet uit de request-body.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  let body: { paden?: PadItem[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const paden = Array.isArray(body.paden) ? body.paden : [];
  if (paden.length === 0) {
    return NextResponse.json({ error: "Geen bestanden om te lezen" }, { status: 400 });
  }

  const st = storage();
  try {
    const bestanden: InvoerBestand[] = await Promise.all(
      paden.map(async (p) => ({
        naam: p.naam,
        mediaType: p.type,
        buffer: await st.downloadDocument(p.pad),
      })),
    );
    const res = await leesEnGroepeer(bestanden);
    return NextResponse.json(
      {
        groepen: res.groepen.map((g) => ({
          velden: g.velden,
          bestanden: g.bestand_indices.map((i) => paden[i]),
        })),
        ongegroepeerd: res.ongegroepeerd.map((i) => paden[i]),
        foutPerDocument: res.foutPerDocument,
      },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ error: `Inlezen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}
