import { isDemoMode } from "@/lib/demo";

/**
 * Klein versie-/buildlabel rechtsonder, alleen in de demo- en preview-omgeving (niet in productie).
 * Zo zie je bij "eerst testen dan productie" in één oogopslag of je naar de nieuwe build kijkt.
 */
export function BuildLabel() {
  const tonen = isDemoMode() || process.env.VERCEL_ENV === "preview";
  if (!tonen) return null;
  const sha = (process.env.VERCEL_GIT_COMMIT_SHA ?? "lokaal").slice(0, 7);
  const omgeving = process.env.VERCEL_ENV ?? "dev";
  return (
    <div className="pointer-events-none fixed bottom-1 right-1 z-50 rounded-none bg-ink/70 px-1.5 py-0.5 font-mono text-[10px] text-white/80">
      {omgeving} · {sha}
    </div>
  );
}
