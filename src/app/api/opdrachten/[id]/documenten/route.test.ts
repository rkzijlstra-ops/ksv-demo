import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetById, mockAddDocument, mockUpload, mockGetProfiel } = vi.hoisted(() => ({
  mockGetById: vi.fn(),
  mockAddDocument: vi.fn(),
  mockUpload: vi.fn(),
  mockGetProfiel: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: () => ({ getMeldingById: mockGetById, addDocument: mockAddDocument, getProfiel: mockGetProfiel }),
}));
vi.mock("@/lib/storage", () => ({
  storage: () => ({ uploadOpdrachtDocument: mockUpload }),
}));
vi.mock("@/lib/auth", () => ({
  getAuthenticatedUserId: vi.fn().mockResolvedValue("test-user-uuid"),
}));

import { POST } from "./route";

function pdfFile(name = "extra.pdf"): File {
  return new File([new Uint8Array([0x25, 0x50, 0x44, 0x46])], name, { type: "application/pdf" });
}
function pngFile(name = "schets.png"): File {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: "image/png" });
}
function req(files: File[]): Request {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  return new Request("http://localhost/api/opdrachten/opdr-1/documenten", { method: "POST", body: fd });
}
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/opdrachten/[id]/documenten", () => {
  beforeEach(() => {
    mockGetById.mockReset();
    mockAddDocument.mockReset();
    mockUpload.mockReset();
    mockGetProfiel.mockReset();
    mockGetProfiel.mockResolvedValue({ rol: "beheerder" });
    mockAddDocument.mockResolvedValue({ id: "doc-new" });
    mockUpload.mockResolvedValue({ pad: "uuid.png", publieke_url: "https://x/opdracht-documenten/uuid.png" });
  });

  it("403 voor een monteur", async () => {
    mockGetProfiel.mockResolvedValue({ rol: "monteur" });
    const res = await POST(req([pdfFile()]), params("opdr-1"));
    expect(res.status).toBe(403);
    expect(mockAddDocument).not.toHaveBeenCalled();
  });

  it("voegt een document toe aan een bestaande opdracht, 200", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", referentienummer: "7407" });

    const res = await POST(req([pngFile()]), params("opdr-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockUpload).toHaveBeenCalledOnce();
    const arg = mockAddDocument.mock.calls[0][0];
    expect(arg.opdracht_id).toBe("opdr-1");
    expect(arg.type).toBe("afbeelding");
    expect(arg.is_primair).toBe(false);
    expect(arg.referentienummer).toBe("7407");
    expect(arg.user_id).toBe("test-user-uuid");
    expect(body.documenten).toHaveLength(1);
  });

  it("404 als de opdracht niet bestaat", async () => {
    mockGetById.mockResolvedValue(null);

    const res = await POST(req([pdfFile()]), params("onbekend"));
    expect(res.status).toBe(404);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockAddDocument).not.toHaveBeenCalled();
  });

  it("400 als er geen bestanden zijn", async () => {
    mockGetById.mockResolvedValue({ id: "opdr-1", referentienummer: "7407" });

    const res = await POST(req([]), params("opdr-1"));
    expect(res.status).toBe(400);
    expect(mockAddDocument).not.toHaveBeenCalled();
  });
});
