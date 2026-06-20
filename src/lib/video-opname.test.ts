import { describe, it, expect } from "vitest";
import {
  kiesVideoMimeType,
  isGrootBestand,
  bytesNaarMB,
  GROOT_BESTAND_BYTES,
} from "./video-opname";

describe("kiesVideoMimeType", () => {
  it("kiest mp4 als de browser dat ondersteunt", () => {
    expect(kiesVideoMimeType((t) => t === "video/mp4")).toBe("video/mp4");
  });

  it("valt terug op webm als mp4 niet kan", () => {
    expect(kiesVideoMimeType((t) => t.startsWith("video/webm"))).toBe("video/webm;codecs=vp9");
  });

  it("geeft undefined als niets wordt ondersteund (recorder kiest dan zelf)", () => {
    expect(kiesVideoMimeType(() => false)).toBeUndefined();
  });
});

describe("isGrootBestand", () => {
  it("is false op of onder de grens", () => {
    expect(isGrootBestand(GROOT_BESTAND_BYTES)).toBe(false);
    expect(isGrootBestand(GROOT_BESTAND_BYTES - 1)).toBe(false);
  });

  it("is true boven de grens", () => {
    expect(isGrootBestand(GROOT_BESTAND_BYTES + 1)).toBe(true);
  });

  it("de grens staat op 100 MB (waarschuwen rond >1 min upload op een gemiddelde mobiele verbinding)", () => {
    expect(GROOT_BESTAND_BYTES).toBe(100 * 1024 * 1024);
  });

  it("een korte FHD-clip (~40 MB) waarschuwt niet, een grote/4K-video (~250 MB) wel", () => {
    expect(isGrootBestand(40 * 1024 * 1024)).toBe(false);
    expect(isGrootBestand(250 * 1024 * 1024)).toBe(true);
  });
});

describe("bytesNaarMB", () => {
  it("rondt af naar hele MB", () => {
    expect(bytesNaarMB(200 * 1024 * 1024)).toBe(200);
    expect(bytesNaarMB(1.5 * 1024 * 1024)).toBe(2);
  });
});
