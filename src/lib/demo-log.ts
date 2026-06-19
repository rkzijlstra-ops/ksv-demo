import { createClient } from "@supabase/supabase-js";
import { isDemoMode } from "./demo";

/**
 * Legt in de DEMO een (bedoeld) bericht vast in demo_berichten, zodat het notificatie-paneel kan tonen
 * wat het systeem deed, ook als de echte SMS/mail door de allowlist is overgeslagen. Best-effort en
 * volledig no-op buiten demo-modus, zodat de mail/sms-laag in productie onaangeraakt blijft.
 */
export async function logDemoBericht(b: {
  kanaal: "sms" | "mail";
  naar: string;
  samenvatting?: string;
  verstuurd: boolean;
  reden?: string;
}): Promise<void> {
  if (!isDemoMode()) return;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!url || !key) return;
  try {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await admin.from("demo_berichten").insert({
      kanaal: b.kanaal,
      naar: b.naar,
      samenvatting: b.samenvatting ?? null,
      verstuurd: b.verstuurd,
      reden: b.reden ?? null,
    });
  } catch {
    // best-effort: een mislukte demo-log mag de echte actie nooit blokkeren.
  }
}
