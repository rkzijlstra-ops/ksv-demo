import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";
import { OPDRACHTGEVER_EMAIL } from "./global-setup";

/** Ruimt de tijdelijke test-opdrachtgever weer op na de e2e-run. */
export default async function globalTeardown() {
  const env: Record<string, string> = {};
  for (const line of readFileSync(path.join(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2];
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const secret = env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return;

  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const uid = data?.users?.find((u) => u.email?.toLowerCase() === OPDRACHTGEVER_EMAIL)?.id;
  if (uid) await admin.auth.admin.deleteUser(uid).catch(() => {}); // profiel cascadeert mee
}
