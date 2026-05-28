import { urgentieConfig, type Urgentie } from "@/lib/urgentie";
import { Badge } from "./Badge";

export function UrgentieBadge({ urgentie }: { urgentie: Urgentie }) {
  const config = urgentieConfig(urgentie);
  if (!config) return null;
  return <Badge config={config} />;
}
