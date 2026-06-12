import { HeaderSkelet, SectieSkelet } from "@/components/Skelet";

/** Laadscherm voor de opdracht-detailpagina van de monteur. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-28">
      <HeaderSkelet />
      <div className="mt-6 flex flex-col gap-6">
        <SectieSkelet />
        <SectieSkelet />
      </div>
    </main>
  );
}
