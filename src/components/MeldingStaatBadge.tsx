import { meldingStaatConfig } from "@/lib/urgentie";
import { Badge } from "./Badge";

export function MeldingStaatBadge({
  spoed,
  spoed_verzonden_at,
}: {
  spoed: boolean;
  spoed_verzonden_at: string | null;
}) {
  return <Badge config={meldingStaatConfig(spoed, spoed_verzonden_at)} />;
}
