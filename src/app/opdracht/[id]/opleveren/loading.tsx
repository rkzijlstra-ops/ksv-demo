import { HeaderSkelet, SectieSkelet } from "@/components/Skelet";

/** Laadscherm voor het oplever-scherm: header + de stap-secties. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-2xl p-4 pb-40">
      <HeaderSkelet />
      <div className="mt-6 flex flex-col gap-6">
        <SectieSkelet />
        <SectieSkelet />
        <SectieSkelet />
      </div>
    </main>
  );
}
