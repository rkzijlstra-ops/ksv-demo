import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "@/lib/demo";
import { seedDemo } from "@/lib/demo-seed";

/**
 * Zet de DEMO-omgeving terug naar de schone, gevulde begintoestand (en schuift de datums naar deze week).
 *
 * Harde grendel: draait ALLEEN als DEMO_MODE=1. Op productie staat die vlag niet, dus deze route is daar
 * inert (403). De echte isolatie zit op env-niveau: de demo-deploy heeft zijn eigen Supabase-project,
 * dus zelfs deze service-role-actie kan nooit bij productie-data.
 */
export async function POST(req: Request): Promise<NextResponse> {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Alleen beschikbaar in de demo-omgeving" }, { status: 403 });
  }
  // volledig=true -> ook de beheerder leeg (een ander neemt de demo over). Standaard (false) houdt de
  // huidige beheerder, zodat de demo-draaier zich niet opnieuw hoeft te melden.
  let volledig = false;
  try {
    const body = (await req.json()) as Record<string, unknown>;
    volledig = body?.volledig === true;
  } catch {
    // geen body: gewone reset (beheerder blijft).
  }
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ error: "Demo niet juist geconfigureerd" }, { status: 500 });
  }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const r = await seedDemo(admin, { behoudKantoorContact: !volledig });
    return NextResponse.json({ ok: true, volledig, ...r }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Reset mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}
