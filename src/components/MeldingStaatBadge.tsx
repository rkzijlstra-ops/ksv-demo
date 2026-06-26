import { meldingStaatConfig } from "@/lib/urgentie";
import { Badge } from "./Badge";

export function MeldingStaatBadge({
  spoed,
  spoed_verzonden_at,
}: {
  spoed: boolean;
  spoed_verzonden_at: string | null;
}) {
  const config = meldingStaatConfig(spoed, spoed_verzonden_at);
  // Gewone melding: geen badge (alleen spoed krijgt een label).
  if (!config) return null;
  return <Badge config={config} />;
}
