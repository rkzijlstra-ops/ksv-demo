import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_SECRET } from "../e2e/test-env";

/**
 * Ruimt de demo-klussen weer op NA de demo-e2e. De demo-e2e draait tegen de gedeelde test-DB (die ook
 * kluslus-test voedt), dus zonder deze opruiming blijven de "Fam. Demo-*"-klussen op het bord staan en
 * ziet Reinier ze als test-rommel. Scoped op de demo-zaak "Demo Keukenstudio"; raakt geen andere data.
 * De zaak en de vaste demo-accounts blijven staan (de seed hergebruikt ze).
 */
export default async function globalTeardown() {
  if (!SUPABASE_URL || !SUPABASE_SECRET) return;
  const admin = createClient(SUPABASE_URL, SUPABASE_SECRET, { auth: { persistSession: false } });
  const { data: zaak } = await admin
    .from("opdrachtgevers")
    .select("id")
    .eq("naam", "Demo Keukenstudio")
    .limit(1)
    .maybeSingle();
  if (zaak?.id) {
    await admin.from("meldingen").delete().eq("opdrachtgever_id", zaak.id as string);
  }
}
