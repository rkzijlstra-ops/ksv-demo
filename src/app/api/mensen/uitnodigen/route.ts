import { NextResponse } from "next/server";
import { db, type Rol } from "@/lib/db";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { verstuurUitnodiging } from "@/lib/mail";
import { verstuurUitnodigingSms } from "@/lib/uitnodig-sms";
import { normaliseerNlMobiel } from "@/lib/telefoon";
import { getAuthenticatedUserId } from "@/lib/auth";

const UIT_TE_NODIGEN_ROLLEN: Rol[] = ["monteur", "opdrachtgever"];

/**
 * Nodigt een persoon uit: maakt (of vindt) het account, zet het profiel (rol + zaak) en stuurt
 * een uitnodigingsmail. Alleen voor de beheerder.
 */
export async function POST(req: Request) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (eigen?.rol !== "beheerder") {
    return NextResponse.json({ error: "Alleen de beheerder mag gebruikers uitnodigen" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige body" }, { status: 400 });
  }
  const naam = typeof body.naam === "string" ? body.naam.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const rol = body.rol as Rol;
  if (!naam || !email || !UIT_TE_NODIGEN_ROLLEN.includes(rol)) {
    return NextResponse.json(
      { error: "Vul naam, e-mailadres en een geldige rol (monteur of opdrachtgever) in" },
      { status: 400 },
    );
  }
  // Optioneel 06-nummer voor het SMS-vangnet. Streng genormaliseerd: een ongeldig nummer wordt null
  // (geen SMS, niets weggeschreven), zodat we nooit geld verbranden aan een onbereikbaar nummer.
  const telefoonRaw = typeof body.telefoon === "string" ? body.telefoon : "";
  const telefoon = normaliseerNlMobiel(telefoonRaw);

  const zaak = await dbi.getStandaardOpdrachtgever();

  // Account aanmaken of, als het al bestaat, opzoeken.
  const admin = supabaseAdmin();
  let inviteeId: string | undefined;
  const { data: aangemaakt, error: maakFout } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (aangemaakt?.user?.id) {
    inviteeId = aangemaakt.user.id;
  } else if (maakFout) {
    const { data: lijst } = await admin.auth.admin.listUsers();
    inviteeId = lijst?.users?.find((u) => u.email?.toLowerCase() === email)?.id;
  }
  if (!inviteeId) {
    return NextResponse.json(
      { error: `Account aanmaken/opzoeken mislukt: ${maakFout?.message ?? "onbekend"}` },
      { status: 502 },
    );
  }

  // Bescherming: een bestaand beheerder-account niet per ongeluk degraderen (bv. jezelf toevoegen).
  const bestaand = await dbi.getProfiel(inviteeId);
  if (bestaand?.rol === "beheerder" && rol !== "beheerder") {
    return NextResponse.json(
      { error: "Dit account is beheerder; de rol is niet gewijzigd. (Jezelf hoef je niet toe te voegen.)" },
      { status: 409 },
    );
  }

  try {
    await dbi.upsertProfiel({
      id: inviteeId,
      rol,
      naam,
      opdrachtgever_id: zaak?.id ?? null,
      // Alleen meegeven als er een geldig nummer is; weglaten laat een bestaand nummer ongemoeid.
      ...(telefoon ? { telefoon } : {}),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Profiel opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  const appUrl = new URL(req.url).origin;

  // Uitnodigingsmail; mislukt dit, dan staat het account er wel (Reinier kan handmatig melden).
  let mailVerstuurd = true;
  try {
    await verstuurUitnodiging({
      naar: email,
      naam,
      rol,
      appUrl,
      organisatie: zaak?.naam ?? "",
    });
  } catch {
    mailVerstuurd = false;
  }

  // SMS-vangnet: alleen als er een geldig 06 is. Best-effort, los van de mail, zodat de uitnodiging
  // als geheel niet klapt op een SMS-fout.
  let smsVerstuurd = false;
  if (telefoon) {
    try {
      await verstuurUitnodigingSms({
        naar: telefoon,
        naam,
        appUrl,
        organisatie: zaak?.naam ?? "",
      });
      smsVerstuurd = true;
    } catch {
      smsVerstuurd = false;
    }
  }

  return NextResponse.json(
    { ok: true, mailVerstuurd, smsGevraagd: !!telefoon, smsVerstuurd },
    { status: 200 },
  );
}
