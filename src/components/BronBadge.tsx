import { bronConfig, type Bron } from "@/lib/urgentie";
import { Badge } from "./Badge";

export function BronBadge({ bron }: { bron: Bron }) {
  return <Badge config={bronConfig(bron)} />;
}
