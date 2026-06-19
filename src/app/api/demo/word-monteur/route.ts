import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isDemoMode, DEMO_WACHTWOORD } from "@/lib/demo";
import { normaliseerNlMobiel } from "@/lib/telefoon";

/**
 * Demo-only zelf-aanmelden als monteur: iemand scant de QR op het dashboard, vult naam + 06 + e-mail in,
 * en wordt ter plekke een echte monteur in de demo (eigen account + profiel), meteen ingelogd op zijn
 * telefoon. Daardoor verschijnt hij met naam op het planbord en komen de "nieuwe klus"-SMS en mails op
 * zíjn toestel. Gegrendeld op DEMO_MODE.
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

  // Eigen login-account (de tester logt niet met e-mail in; hij wordt na aanmelden meteen ingelogd).
  const loginEmail = `demo-monteur-${globalThis.crypto.randomUUID()}@voorbeeld.kluslus.test`;
  const gemaakt = await admin.auth.admin.createUser({
    email: loginEmail,
    password: DEMO_WACHTWOORD,
    email_confirm: true,
  });
  const id = gemaakt.data?.user?.id;
  if (!id) return NextResponse.json({ error: "Account aanmaken mislukt" }, { status: 503 });

  const { data: zaak } = await admin.from("opdrachtgevers").select("id").limit(1).maybeSingle();
  const { error: pErr } = await admin.from("profielen").upsert(
    {
      id,
      rol: "monteur",
      naam,
      telefoon,
      contact_email: email,
      sms_werk_kritiek: true,
      sms_overig: true,
      opdrachtgever_id: (zaak?.id as string) ?? null,
    },
    { onConflict: "id" },
  );
  if (pErr) return NextResponse.json({ error: `Profiel aanmaken mislukt: ${pErr.message}` }, { status: 503 });

  // Meteen inloggen op het toestel van de tester (zet de sessie-cookies op de response).
  const supabase = await createSupabaseServerClient();
  const { error: sErr } = await supabase.auth.signInWithPassword({ email: loginEmail, password: DEMO_WACHTWOORD });
  if (sErr) return NextResponse.json({ error: "Inloggen mislukt" }, { status: 503 });

  return NextResponse.json({ ok: true }, { status: 200 });
}
