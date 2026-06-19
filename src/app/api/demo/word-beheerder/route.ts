import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isDemoMode, DEMO_ACCOUNTS, DEMO_WACHTWOORD } from "@/lib/demo";
import { normaliseerNlMobiel } from "@/lib/telefoon";

/** Zoekt de user-ids van de vaste demo-accounts (kantoor + de twee voorbeeld-monteurs). */
async function vasteIds(admin: SupabaseClient): Promise<Record<string, string>> {
  const wil = new Map([
    [DEMO_ACCOUNTS.kantoor.email, "kantoor"],
    [DEMO_ACCOUNTS.monteur.email, "monteur"],
    [DEMO_ACCOUNTS.monteur2.email, "monteur2"],
  ]);
  const out: Record<string, string> = {};
  for (let page = 1; page <= 30; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 100 });
    const users = data?.users ?? [];
    for (const u of users) {
      const sleutel = u.email ? wil.get(u.email) : undefined;
      if (sleutel) out[sleutel] = u.id;
    }
    if (users.length < 100 || Object.keys(out).length === wil.size) break;
  }
  return out;
}

/**
 * Demo-only: de persoon die de demo draait meldt zich bij de start aan als BEHEERDER (naam + 06 + e-mail).
 * Dat zet het kantoor-account op zijn contact, koppelt de voorbeeld-monteurs aan datzelfde contact (zodat
 * klussen aan hen bij de demo-draaier binnenkomen), en logt hem in op het dashboard.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isDemoMode()) return NextResponse.json({ error: "Alleen in de demo" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const naam = typeof body.naam === "string" ? body.naam.trim() : "";
  const telefoon = normaliseerNlMobiel(typeof body.telefoon === "string" ? body.telefoon : null);
  const email = typeof body.email === "string" && body.email.includes("@") ? body.email.trim() : null;
  if (!naam) return NextResponse.json({ error: "Vul je naam in" }, { status: 400 });
  if (!telefoon && !email) {
    return NextResponse.json({ error: "Vul een geldig 06-nummer en/of e-mailadres in" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: "Demo niet juist geconfigureerd" }, { status: 500 });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const ids = await vasteIds(admin);
  if (!ids.kantoor) return NextResponse.json({ error: "Demo nog niet klaargezet (speel opnieuw)" }, { status: 503 });

  // Kantoor (beheerder) op zijn eigen contact + naam; de voorbeeld-monteurs op hetzelfde contact.
  const contact = { telefoon, contact_email: email, sms_werk_kritiek: true, sms_overig: true };
  const { error: kErr } = await admin.from("profielen").update({ naam, ...contact }).eq("id", ids.kantoor);
  if (kErr) return NextResponse.json({ error: `Opslaan mislukt: ${kErr.message}` }, { status: 503 });
  const monteurIds = [ids.monteur, ids.monteur2].filter(Boolean);
  if (monteurIds.length > 0) await admin.from("profielen").update(contact).in("id", monteurIds);

  // Inloggen als kantoor (zet de sessie-cookies op de response).
  const supabase = await createSupabaseServerClient();
  const { error: sErr } = await supabase.auth.signInWithPassword({
    email: DEMO_ACCOUNTS.kantoor.email,
    password: DEMO_WACHTWOORD,
  });
  if (sErr) return NextResponse.json({ error: "Inloggen mislukt" }, { status: 503 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
