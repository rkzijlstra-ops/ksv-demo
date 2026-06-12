/**
 * Pulserende grijze placeholders in app-stijl voor de loading.tsx-schermen. Tonen meteen de contour
 * van het scherm dat eraan komt, zodat navigeren direct voortgang laat zien in plaats van een
 * bevroren scherm.
 */

/** Eén grijze balk. Geef hoogte/breedte mee via className (bv. "h-5 w-1/2"). */
export function Balk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-none bg-line/50 ${className}`} aria-hidden="true" />;
}

/** Kop-blok in app-stijl met de accent-onderbalk, zoals elke pagina-header. */
export function HeaderSkelet() {
  return (
    <div className="relative border-2 border-b-0 border-line bg-white px-5 py-5">
      <Balk className="h-3 w-28" />
      <Balk className="mt-2 h-7 w-56" />
      <Balk className="mt-2 h-3 w-36" />
      <span aria-hidden className="absolute inset-x-0 bottom-0 h-1.5 bg-accent" />
    </div>
  );
}

/** Klus-kaart-skelet, zelfde vorm als OpdrachtCard. */
export function KaartSkelet() {
  return (
    <div className="flex min-h-[72px] items-center gap-3 border-2 border-line border-l-[8px] border-l-line bg-white p-4">
      <div className="flex-1">
        <Balk className="h-5 w-1/2" />
        <Balk className="mt-2 h-3 w-2/3" />
        <Balk className="mt-2 h-3 w-1/3" />
      </div>
    </div>
  );
}

/** Blok-skelet voor een inhoudssectie (kop + een paar regels). */
export function SectieSkelet() {
  return (
    <div className="border-2 border-line bg-white p-4">
      <Balk className="h-4 w-40" />
      <Balk className="mt-3 h-3 w-full" />
      <Balk className="mt-2 h-3 w-5/6" />
      <Balk className="mt-2 h-3 w-2/3" />
    </div>
  );
}
