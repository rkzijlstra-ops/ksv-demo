import { verstuurSms } from "../src/lib/sms.ts";

/**
 * Eenmalige rooktest voor de CM.com-koppeling: stuurt één SMS naar het meegegeven nummer.
 * Draaien: `npm run test:sms -- +31612345678` (env komt uit .env.local).
 * De allowlist in .env.local beschermt: staat het nummer er niet op, dan wordt het overgeslagen.
 */
async function main() {
  const naar = process.argv[2];
  if (!naar) {
    console.error("\n  Geef een mobiel nummer mee in +31-formaat, bijv:");
    console.error("  npm run test:sms -- +31612345678\n");
    process.exit(1);
  }

  const afzender = process.env.SMS_AFZENDER?.trim() || "KSV";
  const tekst = "Testbericht Keukenstudio Voorschoten: de SMS-notificaties werken. Niet reageren.";

  console.log(`\n  Versturen naar ${naar} (afzender "${afzender}")...`);
  await verstuurSms({ naar, tekst, afzender });
  console.log("  OK: de gateway gaf geen fout. Check je telefoon.");
  console.log("  Komt er niets binnen, kijk in het CM.com-dashboard bij de verzendlog.\n");
}

main().catch((err) => {
  console.error(`\n  FOUT: ${(err as Error).message}\n`);
  process.exit(1);
});
