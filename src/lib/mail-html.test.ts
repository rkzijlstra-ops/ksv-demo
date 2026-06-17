import { describe, it, expect } from "vitest";
import { htmlVanTekst } from "./mail-html";

describe("htmlVanTekst", () => {
  it("zet de tekst in een HTML-document met body", () => {
    const html = htmlVanTekst("Beste,\n\nHierbij het rapport.");
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain("Hierbij het rapport.");
  });

  it("maakt een aparte alinea per dubbele regelafbreking", () => {
    const html = htmlVanTekst("Eerste alinea.\n\nTweede alinea.");
    expect(html.match(/<p[ >]/g)?.length).toBe(2);
  });

  it("zet een enkele regelafbreking om naar <br>", () => {
    const html = htmlVanTekst("Regel een\nRegel twee");
    expect(html).toContain("Regel een<br>Regel twee");
  });

  it("escapet HTML-tekens zodat tekst nooit als markup wordt gelezen", () => {
    const html = htmlVanTekst("1 < 2 & 3 > 0 <script>");
    expect(html).toContain("1 &lt; 2 &amp; 3 &gt; 0 &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("levert geldige inhoud bij een lege tekst", () => {
    const html = htmlVanTekst("");
    expect(html).toMatch(/^<!doctype html>/i);
  });
});
