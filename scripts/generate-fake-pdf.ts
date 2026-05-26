import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4 portrait
  const helv = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const black = rgb(0, 0, 0);

  const line = (
    text: string,
    opts: { size?: number; font?: typeof helv } = {},
  ) => {
    const size = opts.size ?? 10;
    page.drawText(text, { x: 50, y, size, font: opts.font ?? helv, color: black });
    y -= size + 4;
  };

  line("KEUKENSTUDIO VOORSCHOTEN", { size: 16, font: bold });
  line("Service-melding", { size: 12 });
  y -= 8;
  line("Klant:            J. Jansen", { font: bold });
  line("Adres:            Hoofdstraat 12, 2342 AB Voorschoten");
  line("Referentienummer: 7444", { font: bold });
  line("Adviseur:         M. de Vries");
  y -= 16;

  line("ARTIKELEN MET MELDING", { size: 13, font: bold });
  y -= 6;

  line("Artikel:     F-BK-LD-60", { font: bold });
  line("Omschrijving: Front bovenkast linksdraaiend 60cm");
  line("Uw melding:   Beschadigd bij ontvangst, deuk in linkerzijkant.");
  line("              Nabestellen graag.");
  y -= 10;

  line("Artikel:     GR-RVS-90", { font: bold });
  line("Omschrijving: Greep RVS 90mm");
  line("Uw melding:   Krom geleverd, gelieve nabestellen.");

  const outDir = join(process.cwd(), "test-pdfs");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "voorbeeld.pdf");
  const bytes = await doc.save();
  writeFileSync(outPath, bytes);
  console.log(`✓ ${outPath} aangemaakt (${bytes.length} bytes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
