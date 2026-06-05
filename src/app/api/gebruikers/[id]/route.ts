import { NextResponse } from "next/server";
import { db, type Rol, type Db } from "@/lib/db";
import { supabaseAdmin, getGebruikerEmail } from "@/lib/supabase-admin";
import { verstuurAfmelding } from "@/lib/mail";
import { getAuthenticatedUserId } from "@/lib/auth";

const WIJZIGBARE_ROLLEN: Rol[] = ["monteur", "opdrachtgever"];

/** Poort: alleen de beheerder mag gebruikers beheren. Geeft userId + db terug, of een foutrespons. */
async function vereisBeheerder(): Promise<{ error: NextResponse } | { userId: string; dbi: Db }> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return { error: NextResponse.json({ error: "Niet ingelogd" }, { status: 401 }) };
  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "beheerder") {
    return { error: NextResponse.json({ error: "Alleen de beheerder mag dit" }, { status: 403 }) };
  }
  return { userId, dbi };
}

/** Verwijdert een gebruiker (account + profiel) en stuurt een nette afmeld-mail. */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await vereisBeheerder();
  if ("error" in gate) return gate.error;
  const { userId, dbi } = gate;
  const { id } = await params;

  if (id === userId) {
    return NextResponse.json({ error: "Je kunt jezelf niet verwijderen" }, { status: 400 });
  }

  const doel = await dbi.getProfiel(id);
  if (!doel) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  }

  if (doel.rol === "beheerder" && (await dbi.telBeheerders()) <= 1) {
    return NextResponse.json(
      { error: "Dit is de laatste beheerder; die kun je niet verwijderen" },
      { status: 409 },
    );
  }

  if (doel.rol === "monteur") {
    const klussen = await dbi.telToegewezenOpdrachten(id);
    if (klussen > 0) {
      return NextResponse.json(
        {
          error: `Deze monteur heeft nog ${klussen} openstaande ${
            klussen === 1 ? "klus" : "klussen"
          }. Plan die eerst om voordat je hem verwijdert.`,
        },
        { status: 409 },
      );
    }
  }

  // E-mail en zaaknaam ophalen vóór het verwijderen; daarna is het account weg.
  const email = await getGebruikerEmail(id);
  const zaak = await dbi.getStandaardOpdrachtgever();

  const { error: delFout } = await supabaseAdmin().auth.admin.deleteUser(id);
  if (delFout) {
    return NextResponse.json({ error: `Verwijderen mislukt: ${delFout.message}` }, { status: 503 });
  }

  // De afmeld-mail is netjes maar niet kritiek: mislukt die, dan is het account toch al weg.
  let mailVerstuurd = false;
  if (email) {
    try {
      await verstuurAfmelding({ naar: email, naam: doel.naam, organisatie: zaak?.naam ?? "" });
      mailVerstuurd = true;
    } catch {
      mailVerstuurd = false;
    }
  }

  return NextResponse.json({ ok: true, mailVerstuurd }, { status: 200 });
}

/** Wijzigt de rol van een gebruiker (monteur <-> opdrachtgever). */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await vereisBeheerder();
  if ("error" in gate) return gate.error;
  const { userId, dbi } = gate;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const rol = body.rol as Rol;
  if (!WIJZIGBARE_ROLLEN.includes(rol)) {
    return NextResponse.json({ error: "Kies rol monteur of opdrachtgever" }, { status: 400 });
  }
  if (id === userId) {
    return NextResponse.json({ error: "Je kunt je eigen rol niet wijzigen" }, { status: 400 });
  }

  const doel = await dbi.getProfiel(id);
  if (!doel) {
    return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
  }
  if (doel.rol === "beheerder") {
    return NextResponse.json(
      { error: "Een beheerder degradeer je niet via dit scherm" },
      { status: 409 },
    );
  }

  try {
    await dbi.updateProfielRol(id, rol);
  } catch (err) {
    return NextResponse.json(
      { error: `Rol wijzigen mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true }, { status: 200 });
}
