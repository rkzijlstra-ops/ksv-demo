import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const upload = vi.fn();
  const getPublicUrl = vi.fn();
  const from = vi.fn(() => ({ upload, getPublicUrl }));
  return { upload, getPublicUrl, from };
});

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({ storage: { from: h.from } })),
}));

import { createStorage } from "./storage";

const cfg = { url: "https://x.supabase.co", secretKey: "sb_secret_xxx" };

beforeEach(() => {
  h.upload.mockReset();
  h.getPublicUrl.mockReset();
  h.from.mockClear();
});

describe("createStorage -> uploadFoto", () => {
  it("uploadt naar bucket 'meldingen-fotos' en geeft public URL terug", async () => {
    h.upload.mockResolvedValue({ data: { path: "abc.jpg" }, error: null });
    h.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://x.supabase.co/storage/v1/object/public/meldingen-fotos/abc.jpg" },
    });

    const result = await createStorage(cfg).uploadFoto(Buffer.from("img"), "image/jpeg");

    expect(h.from).toHaveBeenCalledWith("meldingen-fotos");
    expect(h.upload).toHaveBeenCalledOnce();
    expect(result.url).toContain("meldingen-fotos");
  });

  it("gebruikt .jpg extensie voor jpeg en .png voor png", async () => {
    h.upload.mockResolvedValue({ data: {}, error: null });
    h.getPublicUrl.mockReturnValue({ data: { publicUrl: "u" } });

    await createStorage(cfg).uploadFoto(Buffer.from("a"), "image/jpeg");
    expect(h.upload.mock.calls[0][0]).toMatch(/\.jpg$/);

    await createStorage(cfg).uploadFoto(Buffer.from("b"), "image/png");
    expect(h.upload.mock.calls[1][0]).toMatch(/\.png$/);
  });

  it("gooit Error als upload faalt", async () => {
    h.upload.mockResolvedValue({ data: null, error: { message: "bucket not found" } });
    await expect(
      createStorage(cfg).uploadFoto(Buffer.from("x"), "image/jpeg"),
    ).rejects.toThrow(/bucket not found/);
  });
});

describe("createStorage -> uploadOpdrachtDocument", () => {
  it("uploadt naar bucket 'opdracht-documenten' en geeft pad + publieke_url terug", async () => {
    h.upload.mockResolvedValue({ data: { path: "p" }, error: null });
    h.getPublicUrl.mockReturnValue({
      data: { publicUrl: "https://x.supabase.co/storage/v1/object/public/opdracht-documenten/p.pdf" },
    });

    const result = await createStorage(cfg).uploadOpdrachtDocument(
      Buffer.from("%PDF"),
      "7407-orderafdruk.pdf",
      "application/pdf",
    );

    expect(h.from).toHaveBeenCalledWith("opdracht-documenten");
    expect(h.upload).toHaveBeenCalledOnce();
    expect(result.pad).toMatch(/\.pdf$/);
    expect(result.publieke_url).toContain("opdracht-documenten");
  });

  it("kiest de extensie op basis van de bestandsnaam (png)", async () => {
    h.upload.mockResolvedValue({ data: {}, error: null });
    h.getPublicUrl.mockReturnValue({ data: { publicUrl: "u" } });

    const result = await createStorage(cfg).uploadOpdrachtDocument(
      Buffer.from("img"),
      "schermafbeelding.PNG",
      "image/png",
    );
    expect(result.pad).toMatch(/\.png$/);
    expect(h.upload.mock.calls[0][0]).toMatch(/\.png$/);
  });

  it("gooit Error als document-upload faalt", async () => {
    h.upload.mockResolvedValue({ data: null, error: { message: "quota exceeded" } });
    await expect(
      createStorage(cfg).uploadOpdrachtDocument(Buffer.from("x"), "a.pdf", "application/pdf"),
    ).rejects.toThrow(/quota exceeded/);
  });
});
