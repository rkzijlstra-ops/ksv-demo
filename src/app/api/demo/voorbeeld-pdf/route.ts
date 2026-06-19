import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { isDemoMode } from "@/lib/demo";

/**
 * Genereert ter plekke een voorbeeld-order-PDF (nep-data) voor de demo. De tester downloadt hem en
 * uploadt hem op het dashboard; de AI leest de order in en het referentienummer verschijnt in de lijst.
 * Zo tonen we de "PDF wordt verwerkt"-stap die in productie via inbound-mail binnenkomt. Alleen in demo.
 */
export async function GET(): Promise<NextResponse | Response> {
  if (!isDemoMode()) {
    return NextResponse.json({ error: "Alleen in de demo-omgeving" }, { status: 403 });
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]);
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = 800;
  const zwart = rgb(0, 0, 0);
  const line = (text: string, opts: { size?: number; font?: typeof helv } = {}) => {
    const size = opts.size ?? 10;
    page.drawText(text, { x: 50, y, size, font: opts.font ?? helv, color: zwart });
    y -= size + 4;
  };

  line("DEMO KEUKENSTUDIO", { size: 16, font: bold });
  line("Orderbevestiging (voorbeeld voor de demo)", { size: 12 });
  y -= 8;
  line("Klant:            Fam. Demo-Jansen", { font: bold });
  line("Adres:            Voorbeeldstraat 12, 1234 AB Demostad");
  line("Telefoon:         +3160000000");
  line("Referentienummer: 9444", { font: bold });
  line("Adviseur:         D. Demo");
  y -= 16;
  line("ARTIKELEN MET MELDING", { size: 13, font: bold });
  y -= 6;
  line("Artikel:      F-BK-LD-60", { font: bold });
  line("Omschrijving: Front bovenkast linksdraaiend 60cm");
  line("Uw melding:   Beschadigd bij ontvangst, deuk in linkerzijkant. Nabestellen graag.");
  y -= 10;
  line("Artikel:      GR-RVS-90", { font: bold });
  line("Omschrijving: Greep RVS 90mm");
  line("Uw melding:   Krom geleverd, gelieve nabestellen.");

  const bytes = await doc.save();
  return new Response(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="demo-voorbeeld-order.pdf"',
    },
  });
}
