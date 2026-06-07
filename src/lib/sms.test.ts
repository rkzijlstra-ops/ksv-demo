import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verstuurSms } from "./sms";

describe("verstuurSms", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.stubEnv("CM_PRODUCT_TOKEN", "test-token");
    vi.stubEnv("CM_GW_URL", "https://gw.example/test");
    vi.stubEnv("SMS_DRY_RUN", "");
    vi.stubEnv("SMS_ALLOWLIST", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("post naar de gateway met token, afzender, nummer en tekst", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe("https://gw.example/test");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.messages.authentication.productToken).toBe("test-token");
    expect(body.messages.msg[0].from).toBe("KSV");
    expect(body.messages.msg[0].to[0].number).toBe("+31612345678");
    expect(body.messages.msg[0].body.content).toBe("hoi");
  });

  it("dry-run verstuurt niet echt", async () => {
    vi.stubEnv("SMS_DRY_RUN", "1");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allowlist blokkeert nummers die er niet op staan", async () => {
    vi.stubEnv("SMS_ALLOWLIST", "+31600000000");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("gooit bij een HTTP-fout", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nee", { status: 500 })));
    await expect(
      verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" }),
    ).rejects.toThrow(/SMS versturen mislukt/);
  });

  it("gooit als het token ontbreekt", async () => {
    vi.stubEnv("CM_PRODUCT_TOKEN", "");
    await expect(
      verstuurSms({ naar: "+31612345678", tekst: "hoi", afzender: "KSV" }),
    ).rejects.toThrow(/CM_PRODUCT_TOKEN/);
  });
});
