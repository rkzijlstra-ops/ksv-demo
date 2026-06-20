import { describe, it, expect } from "vitest";
import { PDFDocument } from "pdf-lib";
import { eerstePaginaPdf } from "./pdf-eerste-pagina";

async function maakPdf(paginas: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < paginas; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

describe("eerstePaginaPdf", () => {
  it("reduceert een meerpagina-PDF tot 1 pagina", async () => {
    const res = await eerstePaginaPdf(await maakPdf(4));
    const geladen = await PDFDocument.load(res);
    expect(geladen.getPageCount()).toBe(1);
  });

  it("laat een 1-pagina-PDF ongemoeid (zelfde buffer)", async () => {
    const pdf = await maakPdf(1);
    expect(await eerstePaginaPdf(pdf)).toBe(pdf);
  });

  it("valt terug op het origineel bij onleesbare input", async () => {
    const rommel = Buffer.from("dit is geen pdf");
    expect(await eerstePaginaPdf(rommel)).toBe(rommel);
  });
});
