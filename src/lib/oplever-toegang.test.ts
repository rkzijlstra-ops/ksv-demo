import { describe, it, expect } from "vitest";
import { opleverToegang } from "./oplever-toegang";

describe("opleverToegang", () => {
  it("niets verstuurd: gewoon bewerken, geen waarschuwing, geen read-only", () => {
    const t = opleverToegang({ opdrachtgeverId: "og1", verzendingen: [] });
    expect(t.alVerstuurd).toBe(false);
    expect(t.readOnly).toBe(false);
    expect(t.waarschuwBestaand).toBe(false);
    expect(t.verstuurdOp).toBeNull();
  });

  it("eigen klus + al verstuurd: waarschuwen, niet read-only", () => {
    const t = opleverToegang({
      opdrachtgeverId: null,
      verzendingen: [{ created_at: "2026-06-27T10:00:00Z" }],
    });
    expect(t.eigen).toBe(true);
    expect(t.waarschuwBestaand).toBe(true);
    expect(t.readOnly).toBe(false);
  });

  it("opdrachtgever-klus + al verstuurd: read-only, niet waarschuwen", () => {
    const t = opleverToegang({
      opdrachtgeverId: "og1",
      verzendingen: [{ created_at: "2026-06-27T10:00:00Z" }],
    });
    expect(t.eigen).toBe(false);
    expect(t.readOnly).toBe(true);
    expect(t.waarschuwBestaand).toBe(false);
  });

  it("verstuurdOp = de eerste verzending", () => {
    const t = opleverToegang({
      opdrachtgeverId: "og1",
      verzendingen: [
        { created_at: "2026-06-27T14:00:00Z" },
        { created_at: "2026-06-27T09:00:00Z" },
      ],
    });
    expect(t.verstuurdOp).toBe("2026-06-27T09:00:00Z");
  });
});
