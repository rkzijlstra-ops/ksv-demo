"use client";

import { useSyncExternalStore } from "react";
import { Navigation } from "lucide-react";
import { detectPlatform, navUrl } from "@/lib/nav";

// Platform is een client-only waarde (navigator bestaat niet op de server). useSyncExternalStore
// leest hem na hydratie uit, met "other" als veilige server-snapshot, zonder useEffect + setState
// (dat laatste triggert cascading renders, zie react-hooks/set-state-in-effect). Het platform
// verandert niet tijdens de sessie, dus subscribe is een no-op.
const geenWijziging = () => () => {};

export function NavKnop({ adres }: { adres: string }) {
  const platform = useSyncExternalStore(
    geenWijziging,
    () => detectPlatform(navigator.userAgent),
    () => "other" as const,
  );

  return (
    <a
      href={navUrl(adres, platform)}
      className="flex min-h-[56px] min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-none bg-primary px-2 py-3 text-sm font-bold text-white transition-colors duration-150 hover:opacity-90 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Navigation size={20} strokeWidth={2.5} className="shrink-0" aria-hidden="true" />
      Navigeer
    </a>
  );
}
