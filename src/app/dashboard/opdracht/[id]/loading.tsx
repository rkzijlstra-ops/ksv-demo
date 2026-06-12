import { HeaderSkelet, SectieSkelet } from "@/components/Skelet";

/** Laadscherm voor de opdracht-detailpagina van het kantoor. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl p-4 pb-24">
      <HeaderSkelet />
      <div className="mt-6 flex flex-col gap-6">
        <SectieSkelet />
        <SectieSkelet />
        <SectieSkelet />
      </div>
    </main>
  );
}
