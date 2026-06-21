import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { isTestLoginActief, TEST_LOGIN_ACCOUNTS } from "@/lib/demo";

export const runtime = "nodejs";

type TestAccount = (typeof TEST_LOGIN_ACCOUNTS)[keyof typeof TEST_LOGIN_ACCOUNTS];

/** Zoekt een auth-user op e-mailadres (paginerend), of null. */
async function vindUserId(admin: SupabaseClient, email: string): Promise<string | null> {
  for (let p = 1; p <= 20; p++) {
    const { data } = await admin.auth.admin.listUsers({ page: p, perPage: 100 });
    const u = data?.users?.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (u) return u.id;
    if (!data?.users?.length) break;
  }
  return null;
}

/**
 * Zorgt dat het test-account bestaat met het juiste wachtwoord én een profiel-rol, op WELKE test-database
 * dan ook. Self-provisioning: ontbreekt het account, dan maakt deze het aan. Zo werkt de test-login zowel
 * op de oude gedeelde test-DB als op een eigen kluslus-test-DB, zonder handmatige opzet, en herstelt hij
 * zichzelf nadat de e2e de wachtwoorden heeft gereset.
 */
async function zorgVoorTestAccount(admin: SupabaseClient, acc: TestAccount): Promise<void> {
  let uid = await vindUserId(admin, acc.email);
  if (!uid) {
    const { data } = await admin.auth.admin.createUser({
      email: acc.email,
      password: acc.wachtwoord,
      email_confirm: true,
    });
    uid = data?.user?.id ?? null;
  } else {
    await admin.auth.admin.updateUserById(uid, { password: acc.wachtwoord, email_confirm: true });
  }
  if (!uid) return;
  const { data: zaken } = await admin.from("opdrachtgevers").select("id").order("created_at").limit(1);
  const zaakId = (zaken as { id: string }[] | null)?.[0]?.id ?? null;
  await admin
    .from("profielen")
    .upsert({ id: uid, rol: acc.rol, naam: acc.naam, opdrachtgever_id: zaakId }, { onConflict: "id" });
}

/**
 * Test-only snel-inloggen voor de test-omgeving: open /api/test-login?rol=kantoor (of monteur) en je bent
 * ingelogd als het vaste test-account, zonder Google/magic-link. Gegrendeld op TEST_LOGIN=1 of
 * niet-productie; op de echte prod-/demo-deploy bestaat de route niet (redirect naar home).
 */
export async function GET(req: Request): Promise<NextResponse> {
  if (!isTestLoginActief()) return NextResponse.redirect(new URL("/", req.url));

  const rol = new URL(req.url).searchParams.get("rol") === "kantoor" ? "kantoor" : "monteur";
  const account = TEST_LOGIN_ACCOUNTS[rol];

  const url = process.env.SUPABASE_URL?.trim();
  const secret = process.env.SUPABASE_SECRET_KEY?.trim();
  if (url && secret) {
    try {
      const admin = createClient(url, secret, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      await zorgVoorTestAccount(admin, account);
    } catch {
      // Best effort: lukt het klaarzetten niet, dan proberen we alsnog in te loggen.
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.wachtwoord,
  });
  if (error) return NextResponse.redirect(new URL("/login?test=nogniet", req.url));

  // Kantoor naar het dashboard, monteur naar de werkpool (home).
  return NextResponse.redirect(new URL(rol === "kantoor" ? "/dashboard" : "/", req.url));
}
