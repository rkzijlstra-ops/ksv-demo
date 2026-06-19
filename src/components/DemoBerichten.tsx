import { MessageSquare, Mail, Check, SlashIcon } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase-server";

interface Bericht {
  id: string;
  created_at: string;
  kanaal: "sms" | "mail";
  naar: string;
  samenvatting: string | null;
  verstuurd: boolean;
  reden: string | null;
}

/**
 * Toont in de DEMO de recente notificatie-activiteit (wat het systeem aan SMS/mail deed), zodat de magie
 * zichtbaar is ook als de echte SMS door de allowlist is overgeslagen. Alleen tonen in demo-modus
 * (aanroeper grendelt op isDemoMode()). Faalt stil als de tabel er nog niet is.
 */
export async function DemoBerichten() {
  let berichten: Bericht[] = [];
  try {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("demo_berichten")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(8);
    berichten = (data ?? []) as Bericht[];
  } catch {
    return null;
  }
  if (berichten.length === 0) return null;

  return (
    <section className="mb-4 border-2 border-line bg-white p-4">
      <h2 className="mb-2 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink">
        Verstuurde berichten (demo)
      </h2>
      <ul className="flex flex-col gap-1.5">
        {berichten.map((b) => (
          <li key={b.id} className="flex items-center gap-2 text-sm">
            {b.kanaal === "sms" ? (
              <MessageSquare size={15} strokeWidth={2.2} className="shrink-0 text-ink-muted" aria-hidden="true" />
            ) : (
              <Mail size={15} strokeWidth={2.2} className="shrink-0 text-ink-muted" aria-hidden="true" />
            )}
            {b.verstuurd ? (
              <Check size={15} strokeWidth={2.5} className="shrink-0 text-success" aria-hidden="true" />
            ) : (
              <SlashIcon size={15} strokeWidth={2.5} className="shrink-0 text-ink-muted" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate text-ink">
              {b.kanaal === "sms" ? "SMS" : "Mail"} naar {b.naar}
              {b.samenvatting ? ` — ${b.samenvatting}` : ""}
            </span>
            <span className="shrink-0 text-xs text-ink-muted">
              {b.verstuurd ? "verstuurd" : "overgeslagen"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
