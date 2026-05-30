"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase-client voor de browser. Gebruikt de NEXT_PUBLIC_* env-vars zodat de client
 * de publishable (anon) key kent — die mag in de client. Server gebruikt zijn eigen helper.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
