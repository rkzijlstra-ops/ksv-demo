import { NextResponse } from "next/server";
import { db, type OpleveringConceptInput } from "@/lib/db";
import type { ControlePunt } from "@/lib/oplever-controle";
import { getAuthenticatedUserId } from "@/lib/auth";

/** Houdt alleen geldige controlepunten over ({ punt: string, akkoord: boolean }). */
function leesControle(v: unknown): ControlePunt[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter(
      (c): c is ControlePunt =>
        typeof c === "object" &&
        c !== null &&
        typeof (c as ControlePunt).punt === "string" &&
        typeof (c as ControlePunt).akkoord === "boolean",
    )
    .map((c) => ({ punt: c.punt, akkoord: c.akkoord }));
}

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

  // Eindstaat-keuze is geschrapt; uitkomst is optioneel (default 'afgerond' in de db-laag).
  const uitkomst = geldigeUitkomst(body.uitkomst) ? body.uitkomst : undefined;

  const concept: OpleveringConceptInput = {
    opdracht_id: id,
    uitkomst,
    eindstaat_foto_urls: Array.isArray(body.eindstaat_foto_urls)
      ? (body.eindstaat_foto_urls as string[])
      : [],
    video_url: typeof body.video_url === "string" ? body.video_url : null,
    opmerking: typeof body.opmerking === "string" ? body.opmerking : null,
    rapport_email: typeof body.rapport_email === "string" ? body.rapport_email : null,
    user_id: userId,
  };
  // Handtekening alleen meeschrijven als de body hem bevat. Een tussentijdse opslag laat hem
  // weg en mag de eerder gezette handtekening dus niet wissen.
  if ("handtekening_url" in body) {
    concept.handtekening_url = typeof body.handtekening_url === "string" ? body.handtekening_url : null;
  }
  // Controle-checklist idem: alleen meeschrijven als de body hem bevat.
  if ("controle" in body) {
    concept.controle = leesControle(body.controle) ?? [];
  }
  // Interne notitie en klant-adres: zelfde discipline (alleen meeschrijven als de body ze bevat),
  // zodat een losse tussenopslag ze niet per ongeluk wist.
  if ("interne_opmerking" in body) {
    concept.interne_opmerking = typeof body.interne_opmerking === "string" ? body.interne_opmerking : null;
  }
  if ("klant_rapport_email" in body) {
    concept.klant_rapport_email = typeof body.klant_rapport_email === "string" ? body.klant_rapport_email : null;
  }

  try {
    const { id: oplId } = await (await db()).upsertOpleveringConcept(concept);
    return NextResponse.json({ id: oplId }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: `Opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
}
