import { NextResponse } from "next/server";

// Mini-endpoint om echte netwerkverbinding te checken (de service worker laat /api/ altijd
// door naar het netwerk, dus dit is een betrouwbare online-test). Geen auth nodig.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true });
}
