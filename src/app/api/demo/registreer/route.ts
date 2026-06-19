import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/demo";
import { normaliseerNlMobiel } from "@/lib/telefoon";

/**
 * Demo-only: de tester registreert het toestel waarop hij de demo-berichten wil ontvangen. Zet zijn
 * 06 + e-mail op de demo-profielen (monteur + kantoor), zodat de "nieuwe klus"-SMS en de mails naar zíjn
 * toestel gaan. De demo verstuurt verder gewoon echt (geen filter), dus hij ontvangt het zoals in het echt.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isDemoMode()) return NextResponse.json({ error: "Alleen in de demo" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }
  const telefoon = normaliseerNlMobiel(typeof body.telefoon === "string" ? body.telefoon : null);
  const email = typeof body.email === "string" && body.email.includes("@") ? body.email.trim() : null;
  if (!telefoon && !email) {
    return NextResponse.json({ error: "Vul een geldig 06-nummer en/of e-mailadres in" }, { status: 400 });
  }

  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: "Demo niet juist geconfigureerd" }, { status: 500 });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // De demo-DB bevat alleen de demo-accounts; alle profielen op het testcontact zetten + SMS-voorkeuren aan.
  const patch: Record<string, unknown> = { sms_werk_kritiek: true, sms_overig: true };
  if (telefoon) patch.telefoon = telefoon;
  if (email) patch.contact_email = email;
  const { error } = await admin.from("profielen").update(patch).not("id", "is", null);
  if (error) return NextResponse.json({ error: `Opslaan mislukt: ${error.message}` }, { status: 503 });

  return NextResponse.json({ ok: true, telefoon, email }, { status: 200 });
}
