/** Productie-gateway van CM.com. De trial gebruikt een andere URL; stel die in via CM_GW_URL. */
const CM_GW_DEFAULT = "https://gw.cm.com/v1.0/message";

export interface SmsInput {
  /** Ontvanger in internationaal formaat (+31...). */
  naar: string;
  /** Platte tekst, bij voorkeur onder 160 tekens. */
  tekst: string;
  /** Afzendernaam, max 11 tekens alfanumeriek (of een nummer). */
  afzender: string;
}

/**
 * Verstuurt een SMS via CM.com. Net als de mail (Resend) zit de provider expres achter een functie,
 * zodat een latere wissel alleen dit bestand raakt. Twee demo-vangnetten:
 *  - SMS_DRY_RUN=1 logt in plaats van echt te versturen.
 *  - SMS_ALLOWLIST (komma-lijst) staat alleen die nummers toe; al het andere wordt overgeslagen.
 */
export async function verstuurSms(input: SmsInput): Promise<void> {
  const token = process.env.CM_PRODUCT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      "CM_PRODUCT_TOKEN ontbreekt. Vul hem in .env.local in (zie .env.example) en herstart de dev-server.",
    );
  }

  if (process.env.SMS_DRY_RUN?.trim() === "1") {
    console.log(`[SMS dry-run] naar ${input.naar} (${input.afzender}): ${input.tekst}`);
    return;
  }

  const allowlist = (process.env.SMS_ALLOWLIST ?? "")
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  if (allowlist.length > 0 && !allowlist.includes(input.naar)) {
    console.log(`[SMS allowlist] ${input.naar} staat niet op de lijst, overgeslagen.`);
    return;
  }

  const url = process.env.CM_GW_URL?.trim() || CM_GW_DEFAULT;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: {
          authentication: { productToken: token },
          msg: [
            {
              from: input.afzender,
              to: [{ number: input.naar }],
              body: { type: "auto", content: input.tekst },
            },
          ],
        },
      }),
    });
  } catch (err) {
    throw new Error(`SMS versturen mislukt: ${(err as Error).message}`);
  }
  if (!res.ok) {
    throw new Error(`SMS versturen mislukt: HTTP ${res.status}`);
  }
}
