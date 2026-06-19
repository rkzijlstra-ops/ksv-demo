import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode, leesAllowlist } from "@/lib/demo";

/**
 * Demo-only: zet de testgegevens van de tester (de eerste allowlist-waarden) als klantcontact op een
 * te-plannen klus, zodat de tester zélf echte SMS/mail binnenkrijgt als die klus verstuurd/opgeleverd
 * wordt. Veilig: de allowlist bepaalt wie iets ontvangt; we kopiëren alleen die toegestane waarden.
 */
export async function POST(): Promise<NextResponse> {
  if (!isDemoMode()) return NextResponse.json({ error: "Alleen in de demo" }, { status: 403 });
  const tel = leesAllowlist(process.env.SMS_ALLOWLIST)[0] ?? null;
  const mail = leesAllowlist(process.env.MAIL_ALLOWLIST)[0] ?? null;
  if (!tel && !mail) {
    return NextResponse.json({ error: "Geen testnummer/mail in de allowlist ingesteld" }, { status: 400 });
  }
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return NextResponse.json({ error: "Demo niet juist geconfigureerd" }, { status: 500 });

  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  // Pak een te-plannen klus (pool); zo kan de tester hem inplannen + versturen en de SMS/mail ontvangen.
  const { data: klus } = await admin
    .from("meldingen")
    .select("id")
    .is("opdracht_id", null)
    .eq("dashboard_status", "binnen")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!klus?.id) return NextResponse.json({ error: "Geen te-plannen klus gevonden; speel eerst opnieuw" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (tel) patch.klant_telefoon = tel;
  if (mail) patch.klant_email = mail;
  const { error } = await admin.from("meldingen").update(patch).eq("id", klus.id);
  if (error) return NextResponse.json({ error: `Bijwerken mislukt: ${error.message}` }, { status: 503 });

  return NextResponse.json({ ok: true, opdrachtId: klus.id }, { status: 200 });
}
