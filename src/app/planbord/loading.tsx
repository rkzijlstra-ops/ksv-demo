import { HeaderSkelet, Balk } from "@/components/Skelet";

/** Laadscherm voor het planbord. */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-6xl p-4 pb-24">
      <div className="mb-4">
        <HeaderSkelet />
      </div>
      <div className="border-2 border-line bg-white p-4">
        <Balk className="h-5 w-40" />
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Balk key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    </main>
  );
}
