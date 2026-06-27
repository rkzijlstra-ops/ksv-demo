import { describe, it, expect } from "vitest";
import { opleverToegang } from "./oplever-toegang";

describe("opleverToegang", () => {
  it("niet opgeleverd: gewoon bewerken, geen waarschuwing, geen read-only", () => {
    const t = opleverToegang({ opdrachtgeverId: "og1", opgeleverd: false, verzendingen: [] });
    expect(t.readOnly).toBe(false);
    expect(t.waarschuwBestaand).toBe(false);
    expect(t.verstuurdOp).toBeNull();
  });

  it("eigen klus + opgeleverd: waarschuwen, niet read-only", () => {
    const t = opleverToegang({
      opdrachtgeverId: null,
      opgeleverd: true,
      verzendingen: [{ created_at: "2026-06-27T10:00:00Z" }],
    });
    expect(t.eigen).toBe(true);
    expect(t.waarschuwBestaand).toBe(true);
    expect(t.readOnly).toBe(false);
  });

  it("opdrachtgever-klus + opgeleverd: read-only, niet waarschuwen", () => {
    const t = opleverToegang({
      opdrachtgeverId: "og1",
      opgeleverd: true,
      verzendingen: [{ created_at: "2026-06-27T10:00:00Z" }],
    });
    expect(t.eigen).toBe(false);
    expect(t.readOnly).toBe(true);
    expect(t.waarschuwBestaand).toBe(false);
  });

  it("opdrachtgever-klus al eens verstuurd maar heropend (niet opgeleverd): weer bewerkbaar", () => {
    const t = opleverToegang({
      opdrachtgeverId: "og1",
      opgeleverd: false,
      verzendingen: [{ created_at: "2026-06-27T10:00:00Z" }],
    });
    expect(t.readOnly).toBe(false);
  });

  it("verstuurdOp = de eerste verzending", () => {
    const t = opleverToegang({
      opdrachtgeverId: "og1",
      opgeleverd: true,
      verzendingen: [
        { created_at: "2026-06-27T14:00:00Z" },
        { created_at: "2026-06-27T09:00:00Z" },
      ],
    });
    expect(t.verstuurdOp).toBe("2026-06-27T09:00:00Z");
  });
});
