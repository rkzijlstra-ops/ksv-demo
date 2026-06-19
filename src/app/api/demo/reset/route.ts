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
export async function POST(): Promise<NextResponse> {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Alleen beschikbaar in de demo-omgeving" }, { status: 403 });
  }
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) {
    return NextResponse.json({ error: "Demo niet juist geconfigureerd" }, { status: 500 });
  }
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const r = await seedDemo(admin);
    return NextResponse.json({ ok: true, ...r }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: `Reset mislukt: ${(err as Error).message}` }, { status: 503 });
  }
}
