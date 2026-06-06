import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET, OPDRACHTGEVER_EMAIL } from "./test-env";

/** Ruimt de tijdelijke test-opdrachtgever weer op na de e2e-run. */
export default async function globalTeardown() {
  if (!SUPABASE_URL || !SUPABASE_SECRET) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const uid = data?.users?.find((u) => u.email?.toLowerCase() === OPDRACHTGEVER_EMAIL)?.id;
  if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {}); // profiel cascadeert mee
}
