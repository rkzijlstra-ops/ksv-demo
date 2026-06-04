import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetProfiel, mockGetZaak, mockUpsert, mockCreateUser, mockListUsers, mockMail } =
  vi.hoisted(() => ({
    mockGetProfiel: vi.fn(),
    mockGetZaak: vi.fn(),
    mockUpsert: vi.fn(),
    mockCreateUser: vi.fn(),
    mockListUsers: vi.fn(),
    mockMail: vi.fn(),
  }));

vi.mock("@/lib/db", () => ({
  db: () => ({
    getProfiel: mockGetProfiel,
    getStandaardOpdrachtgever: mockGetZaak,
    upsertProfiel: mockUpsert,
  }),
}));
vi.mock("@/lib/supabase-admin", () => ({
  supabaseAdmin: () => ({ auth: { admin: { createUser: mockCreateUser, listUsers: mockListUsers } } }),
}));
vi.mock("@/lib/mail", () => ({ verstuurUitnodiging: mockMail }));
vi.mock("@/lib/auth", () => ({ getAuthenticatedUserId: vi.fn().mockResolvedValue("beheerder-uid") }));

import { POST } from "./route";

function req(body: unknown): Request {
  return new Request("http://localhost/api/mensen/uitnodigen", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/mensen/uitnodigen", () => {
  beforeEach(() => {
    mockGetProfiel.mockReset();
    mockGetZaak.mockReset();
    mockUpsert.mockReset();
    mockCreateUser.mockReset();
    mockListUsers.mockReset();
    mockMail.mockReset();
    mockGetProfiel.mockResolvedValue({ id: "beheerder-uid", rol: "beheerder" });
    mockGetZaak.mockResolvedValue({ id: "z1", naam: "KSV" });
    mockUpsert.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue({ data: { user: { id: "new-uid" } }, error: null });
    mockMail.mockResolvedValue(undefined);
  });

  it("beheerder nodigt een monteur uit: account, profiel en mail", async () => {
    const res = await POST(req({ naam: "Piet", email: "Piet@x.nl", rol: "monteur" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(mockCreateUser).toHaveBeenCalledWith({ email: "piet@x.nl", email_confirm: true });
    expect(mockUpsert).toHaveBeenCalledWith({
      id: "new-uid",
      rol: "monteur",
      naam: "Piet",
      opdrachtgever_id: "z1",
    });
    expect(mockMail).toHaveBeenCalledOnce();
    expect(body.mailVerstuurd).toBe(true);
  });

  it("valt terug op opzoeken als het account al bestaat", async () => {
    mockCreateUser.mockResolvedValue({ data: null, error: { message: "already registered" } });
    mockListUsers.mockResolvedValue({ data: { users: [{ id: "bestaand", email: "piet@x.nl" }] } });
    await POST(req({ naam: "Piet", email: "piet@x.nl", rol: "monteur" }));
    expect(mockUpsert.mock.calls[0][0].id).toBe("bestaand");
  });

  it("niet-beheerder krijgt 403", async () => {
    mockGetProfiel.mockResolvedValue({ id: "x", rol: "monteur" });
    const res = await POST(req({ naam: "Piet", email: "piet@x.nl", rol: "monteur" }));
    expect(res.status).toBe(403);
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it("ongeldige rol krijgt 400", async () => {
    const res = await POST(req({ naam: "Piet", email: "piet@x.nl", rol: "beheerder" }));
    expect(res.status).toBe(400);
  });

  it("account er, mail mislukt: ok met mailVerstuurd false", async () => {
    mockMail.mockRejectedValue(new Error("resend kapot"));
    const res = await POST(req({ naam: "Piet", email: "piet@x.nl", rol: "monteur" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.mailVerstuurd).toBe(false);
  });
});
