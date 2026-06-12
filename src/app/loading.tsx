import { HeaderSkelet, KaartSkelet } from "@/components/Skelet";

/** Laadscherm voor de werkpool: header + een paar klus-kaarten in app-stijl. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-24">
      <div className="mb-4">
        <HeaderSkelet />
      </div>
      <div className="flex flex-col gap-3">
        <KaartSkelet />
        <KaartSkelet />
        <KaartSkelet />
      </div>
    </main>
  );
}
