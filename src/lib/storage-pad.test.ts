import { describe, it, expect } from "vitest";
import { padUitPublicUrl } from "./storage-pad";

describe("padUitPublicUrl", () => {
  it("haalt het pad uit een foto-public-url (bucket meldingen-fotos)", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/meldingen-fotos/abc-123.jpg";
    expect(padUitPublicUrl(url, "meldingen-fotos")).toBe("abc-123.jpg");
  });

  it("haalt het pad uit een video-public-url (bucket oplever-videos)", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/oplever-videos/def-456.mp4";
    expect(padUitPublicUrl(url, "oplever-videos")).toBe("def-456.mp4");
  });

  it("strijkt een query-string weg", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/meldingen-fotos/abc.jpg?token=xyz";
    expect(padUitPublicUrl(url, "meldingen-fotos")).toBe("abc.jpg");
  });

  it("decodeert URL-escapes in het pad", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/meldingen-fotos/map%20a/foto.jpg";
    expect(padUitPublicUrl(url, "meldingen-fotos")).toBe("map a/foto.jpg");
  });

  it("geeft null als de bucket niet in de url voorkomt", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/andere-bucket/abc.jpg";
    expect(padUitPublicUrl(url, "meldingen-fotos")).toBeNull();
  });

  it("geeft null bij een lege rest na de bucket", () => {
    const url = "https://x.supabase.co/storage/v1/object/public/meldingen-fotos/";
    expect(padUitPublicUrl(url, "meldingen-fotos")).toBeNull();
  });
});
