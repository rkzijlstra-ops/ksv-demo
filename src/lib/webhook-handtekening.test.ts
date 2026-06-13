import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyResendSignature } from "./webhook-handtekening";

const secret = `whsec_${Buffer.from("supergeheim-test-secret").toString("base64")}`;
const id = "msg_123";
const ts = "1700000000";
const body = JSON.stringify({ type: "email.received", data: { email_id: "e1" } });

function tekenen(s: string, mid: string, t: string, b: string): string {
  const bytes = Buffer.from(s.replace(/^whsec_/, ""), "base64");
  return `v1,${createHmac("sha256", bytes).update(`${mid}.${t}.${b}`).digest("base64")}`;
}

describe("verifyResendSignature", () => {
  it("accepteert een geldige handtekening", () => {
    const signature = tekenen(secret, id, ts, body);
    expect(verifyResendSignature(secret, { id, timestamp: ts, signature }, body)).toBe(true);
  });

  it("weigert een gewijzigde body", () => {
    const signature = tekenen(secret, id, ts, body);
    expect(verifyResendSignature(secret, { id, timestamp: ts, signature }, `${body}x`)).toBe(false);
  });

  it("weigert bij een ontbrekende header", () => {
    const signature = tekenen(secret, id, ts, body);
    expect(verifyResendSignature(secret, { id: null, timestamp: ts, signature }, body)).toBe(false);
  });

  it("accepteert als één van meerdere handtekeningen klopt", () => {
    const goed = tekenen(secret, id, ts, body);
    expect(verifyResendSignature(secret, { id, timestamp: ts, signature: `v1,nepsig ${goed}` }, body)).toBe(true);
  });
});
