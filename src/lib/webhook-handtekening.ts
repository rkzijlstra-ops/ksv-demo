import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifieert de handtekening van een Resend-webhook (Svix-schema). Resend tekent elke webhook met de
 * signing secret; zo weten we dat een binnengekomen POST echt van Resend komt en niet vervalst is.
 *
 * De ondertekende inhoud is `${id}.${timestamp}.${body}`, met HMAC-SHA256 over de (base64-gedecodeerde)
 * secret. De `svix-signature`-header bevat een of meer spatie-gescheiden "v1,<sig>"-waarden; één match
 * volstaat. Geef de RUWE body mee (niet de geparste JSON), anders klopt de handtekening niet.
 */
export function verifyResendSignature(
  secret: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  body: string,
): boolean {
  const { id, timestamp, signature } = headers;
  if (!secret || !id || !timestamp || !signature) return false;

  const secretBytes = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${id}.${timestamp}.${body}`;
  const verwacht = createHmac("sha256", secretBytes).update(signedContent).digest("base64");
  const verwachtBuf = Buffer.from(verwacht);

  return signature.split(" ").some((deel) => {
    const sig = deel.split(",")[1];
    if (!sig) return false;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === verwachtBuf.length && timingSafeEqual(sigBuf, verwachtBuf);
  });
}
