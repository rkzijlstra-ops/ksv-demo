import { HeaderSkelet, KaartSkelet } from "@/components/Skelet";

/** Laadscherm voor het kantoor-dashboard. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <div className="mb-4">
        <HeaderSkelet />
      </div>
      <div className="flex flex-col gap-3">
        <KaartSkelet />
        <KaartSkelet />
        <KaartSkelet />
        <KaartSkelet />
      </div>
    </main>
  );
}
