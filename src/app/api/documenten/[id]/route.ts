import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { getAuthenticatedUserId } from "@/lib/auth";

/**
 * Verwijdert een document bij een opdracht. Alleen kantoor. Ruimt ook het storage-bestand op
 * (best-effort: de rij gaat hoe dan ook weg, ook als het bestand al weg was).
 */
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }
  const { id } = await params;

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (!eigen || eigen.rol === "monteur") {
    return NextResponse.json({ error: "Alleen kantoor mag documenten verwijderen" }, { status: 403 });
  }

  const doc = await dbi.getDocumentById(id);
  if (!doc) {
    return NextResponse.json({ error: "Document niet gevonden" }, { status: 404 });
  }

  try {
    await dbi.verwijderDocument(id);
  } catch (err) {
    return NextResponse.json({ error: `Verwijderen mislukt: ${(err as Error).message}` }, { status: 503 });
  }
  // Storage opruimen is best-effort: de rij is al weg, een verweesd bestand mag de actie niet laten falen.
  await storage().verwijderOpdrachtDocument(doc.storage_pad).catch(() => {});

  return NextResponse.json({ verwijderd: true }, { status: 200 });
}
