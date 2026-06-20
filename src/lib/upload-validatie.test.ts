import { describe, it, expect } from "vitest";
import { valideerUploads, MAX_UPLOAD_AANTAL } from "./upload-validatie";

describe("valideerUploads", () => {
  it("staat PDF's en afbeeldingen toe", () => {
    expect(valideerUploads([{ naam: "a.pdf", type: "application/pdf", grootte: 5_000_000 }]).ok).toBe(true);
    expect(valideerUploads([{ naam: "b.jpg", type: "image/jpeg" }]).ok).toBe(true);
  });

  it("weigert lege lijst", () => {
    expect(valideerUploads([]).ok).toBe(false);
    expect(valideerUploads(null).ok).toBe(false);
  });

  it("weigert te veel bestanden", () => {
    const veel = Array.from({ length: MAX_UPLOAD_AANTAL + 1 }, (_, i) => ({ naam: `f${i}.pdf`, type: "application/pdf" }));
    expect(valideerUploads(veel).ok).toBe(false);
  });

  it("weigert niet-ondersteund type", () => {
    expect(valideerUploads([{ naam: "x.exe", type: "application/octet-stream" }]).ok).toBe(false);
  });

  it("weigert een te groot bestand", () => {
    expect(valideerUploads([{ naam: "groot.pdf", type: "application/pdf", grootte: 20 * 1024 * 1024 }]).ok).toBe(false);
  });
});
