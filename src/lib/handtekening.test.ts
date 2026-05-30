import { describe, it, expect } from "vitest";
import { dataUrlNaarBlob } from "./handtekening";

// 1x1 transparante PNG als dataURL
const PNG_DATAURL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

describe("dataUrlNaarBlob", () => {
  it("zet een PNG-dataURL om naar een Blob met juist type en inhoud", () => {
    const blob = dataUrlNaarBlob(PNG_DATAURL);
    expect(blob.type).toBe("image/png");
    expect(blob.size).toBeGreaterThan(0);
  });

  it("gooit een fout bij een dataURL zonder komma", () => {
    expect(() => dataUrlNaarBlob("geen-data-url")).toThrow(/Ongeldige dataURL/);
  });

  it("valt terug op image/png als het mime-deel ontbreekt", () => {
    const blob = dataUrlNaarBlob("data:;base64,QQ==");
    expect(blob.type).toBe("image/png");
  });
});
