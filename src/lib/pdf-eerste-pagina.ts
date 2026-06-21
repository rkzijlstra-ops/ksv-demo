import { PDFDocument } from "pdf-lib";

/**
 * Geeft een PDF terug met alleen de eerste pagina. Voor het inlezen van de kop-velden (referentie,
 * telefoon, klant) is pagina 1 genoeg, en een kleine PDF scheelt fors in kosten/snelheid bij Claude.
 * Lukt het splitsen niet (beveiligd/corrupt/geen PDF), dan komt het originele bestand terug.
 */
export async function eerstePaginaPdf(pdf: Buffer): Promise<Buffer> {
  try {
    const bron = await PDFDocument.load(pdf, { ignoreEncryption: true });
    if (bron.getPageCount() <= 1) return pdf;
    const doel = await PDFDocument.create();
    const [pagina] = await doel.copyPages(bron, [0]);
    doel.addPage(pagina);
    return Buffer.from(await doel.save());
  } catch {
    return pdf;
  }
}
