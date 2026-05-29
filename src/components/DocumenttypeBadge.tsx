import { documenttypeConfig, type Documenttype } from "@/lib/urgentie";
import { Badge } from "./Badge";

export function DocumenttypeBadge({ type }: { type: Documenttype }) {
  const config = documenttypeConfig(type);
  if (!config) return null;
  return <Badge config={config} />;
}
