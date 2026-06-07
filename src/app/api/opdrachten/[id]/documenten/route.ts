import { NextResponse } from "next/server";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import { notificeerNieuwDocument } from "@/lib/notificaties";
import { getAuthenticatedUserId } from "@/lib/auth";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
  }

  const { id } = await params;

  const dbi = await db();
  const eigen = await dbi.getProfiel(userId);
  if (!eigen || eigen.rol === "monteur") {
    return NextResponse.json({ error: "Alleen kantoor mag documenten beheren" }, { status: 403 });
  }
  const opdracht = await dbi.getMeldingById(id);
  if (!opdracht) {
    return NextResponse.json({ error: "Opdracht niet gevonden" }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: `Kon multipart niet lezen: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const files = formData.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Geen bestanden opgegeven" }, { status: 400 });
  }
  for (const f of files) {
    if (f.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: `Bestand te groot: ${f.name} (${f.size} bytes, max ${MAX_FILE_BYTES})` },
        { status: 413 },
      );
    }
  }

  const documenten: Array<{
    id: string;
    bestandsnaam: string;
    type: "pdf" | "afbeelding";
    publieke_url: string;
  }> = [];
  try {
    for (const f of files) {
      const type = f.type === "application/pdf" ? "pdf" : "afbeelding";
      const buf = Buffer.from(await f.arrayBuffer());
      const { pad, publieke_url } = await storage().uploadOpdrachtDocument(buf, f.name, f.type);
      const { id: docId } = await dbi.addDocument({
        opdracht_id: id,
        type,
        bestandsnaam: f.name,
        storage_pad: pad,
        publieke_url,
        referentienummer: opdracht.referentienummer,
        is_primair: false,
        user_id: userId,
      });
      documenten.push({ id: docId, bestandsnaam: f.name, type, publieke_url });
    }
  } catch (err) {
    return NextResponse.json(
      { error: `Document opslaan mislukt: ${(err as Error).message}` },
      { status: 503 },
    );
  }

  // Was de opdracht al verstuurd, dan de monteur informeren (geen herbevestiging; datum/monteur blijven).
  const alVerstuurd =
    opdracht.dashboard_status === "gepland" || opdracht.dashboard_status === "bevestigd";
  if (alVerstuurd && opdracht.toegewezen_aan && opdracht.monteur_naam) {
    await notificeerNieuwDocument({
      toegewezenAan: opdracht.toegewezen_aan,
      monteurNaam: opdracht.monteur_naam,
      klantNaam: opdracht.klant_naam ?? "de opdracht",
      referentienummer: opdracht.referentienummer,
      zaaknaam: opdracht.keukenzaak,
      mailFn: async () => {},
    });
  }

  return NextResponse.json({ documenten }, { status: 200 });
}
