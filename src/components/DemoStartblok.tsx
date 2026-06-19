import { headers } from "next/headers";
import QRCode from "qrcode";

/**
 * Startblok op het kantoor-dashboard in de DEMO: een korte "zo werkt het" plus een QR-code waarmee
 * iemand zich op zijn telefoon als monteur aanmeldt (naam + 06 + e-mail) en meteen meedoet. Server-
 * component: genereert de QR lokaal (geen externe dienst). Alleen tonen in demo-modus.
 */
export async function DemoStartblok() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const monteurUrl = host ? `${proto}://${host}/demo/word-monteur` : "/demo/word-monteur";
  let qr = "";
  try {
    qr = await QRCode.toDataURL(monteurUrl, { width: 168, margin: 1 });
  } catch {
    qr = "";
  }

  return (
    <section className="mb-4 flex flex-col gap-4 border-2 border-accent bg-accent/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-mono text-sm font-extrabold uppercase tracking-[0.08em] text-ink">
          Zo werkt de demo
        </h2>
        <ol className="mt-2 flex flex-col gap-1 text-sm text-ink">
          <li>1. Laat een monteur de QR scannen: hij vult naam + 06 + e-mail in en doet meteen mee.</li>
          <li>2. Plan op dit dashboard een klus in bij die monteur.</li>
          <li>3. Hij krijgt de SMS op zijn telefoon, bevestigt en meldt af, en dit scherm beweegt mee.</li>
        </ol>
        <p className="mt-2 text-xs text-ink-muted">
          Je kunt niets kapotmaken. Met &quot;Speel opnieuw&quot; bovenin staat alles zo weer fris.
        </p>
        <p className="mt-2 text-sm text-ink">
          Wil je zien hoe een order automatisch wordt ingelezen?{" "}
          <a href="/api/demo/voorbeeld-pdf" className="font-bold text-accent underline">
            Download een voorbeeld-order (PDF)
          </a>{" "}
          en upload hem hieronder; de AI leest hem en het referentienummer verschijnt in de lijst.
          (In productie komt dit automatisch via mail binnen.)
        </p>
      </div>
      {qr && (
        <div className="flex shrink-0 flex-col items-center gap-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR-code: doe mee als monteur" width={168} height={168} className="border-2 border-ink bg-white" />
          <span className="text-xs font-bold text-ink">Scan: doe mee als monteur</span>
          <a href={monteurUrl} className="text-[11px] text-accent underline">
            of open hier
          </a>
        </div>
      )}
    </section>
  );
}
