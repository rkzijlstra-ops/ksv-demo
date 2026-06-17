/**
 * Zet platte mailtekst om naar een eenvoudige, nette HTML-versie. Door naast de tekst ook HTML mee
 * te sturen wordt de mail multipart (text + html). Dat haalt het klassieke spampatroon weg van een
 * mail met alleen platte tekst + een PDF-bijlage (en vult meteen de preview in mailclients/Resend).
 * Puur en testbaar; geen opmaak-magie, alleen alinea's en regelafbrekingen.
 */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function htmlVanTekst(tekst: string): string {
  const alineas = escapeHtml(tekst.trim())
    .split(/\n{2,}/)
    .map((a) => `<p style="margin:0 0 14px 0">${a.replace(/\n/g, "<br>")}</p>`)
    .join("");
  return (
    `<!doctype html><html lang="nl"><body style="margin:0;padding:0;background:#ffffff">` +
    `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1a1a1a;max-width:560px;margin:0 auto;padding:8px 4px">` +
    `${alineas}</div></body></html>`
  );
}
