import { describe, it, expect } from "vitest";
import { vervangVersie } from "./genereer-sw-versie.mjs";

describe("vervangVersie", () => {
  it("vervangt de placeholder door de eerste 8 tekens van het build-id", () => {
    const bron = 'const VERSION = "ksv-__BUILD_ID__";';
    expect(vervangVersie(bron, "abcdef1234567890")).toBe(
      'const VERSION = "ksv-abcdef12";',
    );
  });

  it("gebruikt 'dev' als het build-id leeg is", () => {
    const bron = 'const VERSION = "ksv-__BUILD_ID__";';
    expect(vervangVersie(bron, "")).toBe('const VERSION = "ksv-dev";');
  });

  it("gebruikt 'dev' als het build-id ontbreekt", () => {
    const bron = 'const VERSION = "ksv-__BUILD_ID__";';
    expect(vervangVersie(bron, undefined)).toBe('const VERSION = "ksv-dev";');
  });

  it("vervangt elke voorkomende placeholder in de bron", () => {
    const bron = 'a __BUILD_ID__ b __BUILD_ID__ c';
    expect(vervangVersie(bron, "deadbeefcafe")).toBe("a deadbeef b deadbeef c");
  });

  it("laat de rest van de bron ongemoeid", () => {
    const bron =
      'const VERSION = "ksv-__BUILD_ID__";\nconst CACHE = `${VERSION}-shell`;';
    expect(vervangVersie(bron, "1234567890")).toBe(
      'const VERSION = "ksv-12345678";\nconst CACHE = `${VERSION}-shell`;',
    );
  });

  it("kort een kort build-id niet onnodig in", () => {
    const bron = 'const VERSION = "ksv-__BUILD_ID__";';
    expect(vervangVersie(bron, "abc")).toBe('const VERSION = "ksv-abc";');
  });
});
