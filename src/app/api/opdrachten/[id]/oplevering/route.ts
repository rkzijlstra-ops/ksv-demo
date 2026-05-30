import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthenticatedUserId } from "@/lib/auth";

const UITKOMSTEN = ["afgerond", "openstaande_punten"] as const;
type Uitkomst = (typeof UITKOMSTEN)[number];

function geldigeUitkomst(v: unknown): v is Uitkomst {
  return typeof v === "string" && (UITKOMSTEN as readonly string[]).includes(v);
}

/** Haalt de (concept-)oplevering van een opdracht op, voor hervatten van de flow. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const oplevering = await (await db()).getOpleveringVoorOpdracht(id);
    return NextResponse.json({ oplevering }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Ophalen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}

/** Slaat de oplevering als concept op (of werkt hem bij). Eén oplevering per opdracht. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige JSON" }, { status: 400 });
  }

  if (!geldigeUitkomst(body.uitkomst)) {
    return NextResponse.json(
      { error: "Ongeldige of ontbrekende uitkomst (afgerond | openstaande_punten)" },
      { status: 400 },
    );
  }

  try {
    const { id: oplId } = await (await db()).upsertOpleveringConcept({
      opdracht_id: id,
      uitkomst: body.uitkomst,
      eindstaat_foto_urls: Array.isArray(body.eindstaat_foto_urls)
        ? (body.eindstaat_foto_urls as string[])
        : [],
      video_url: typeof body.video_url === "string" ? body.video_url : null,
      handtekening_url: typeof body.handtekening_url === "string" ? body.handtekening_url : null,
      user_id: userId,
    });
    return NextResponse.json({ id: oplId }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
