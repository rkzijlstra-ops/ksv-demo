import { describe, it, expect } from "vitest";
import { meldingMediaTelling } from "./melding-overzicht";

describe("meldingMediaTelling", () => {
  it("geen foto's en geen video: lege string", () => {
    expect(meldingMediaTelling(0, false)).toBe("");
  });

  it("enkelvoud bij precies 1 foto", () => {
    expect(meldingMediaTelling(1, false)).toBe("1 foto");
  });

  it("meervoud bij meer dan 1 foto", () => {
    expect(meldingMediaTelling(3, false)).toBe("3 foto's");
  });

  it("alleen video", () => {
    expect(meldingMediaTelling(0, true)).toBe("video");
  });

  it("foto's en video gescheiden door een punt", () => {
    expect(meldingMediaTelling(2, true)).toBe("2 foto's · video");
  });
});
