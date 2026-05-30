import { describe, it, expect, vi, beforeEach } from "vitest";
import type { QueueMelding } from "./queue-db";

const m = vi.hoisted(() => ({
  queue: [] as QueueMelding[],
  removed: [] as string[],
  statusUpdates: [] as Array<{ id: string; status: string; pogingen?: number }>,
}));

vi.mock("./queue", () => ({
  haalQueueOp: async () =>
    m.queue.slice().sort((a, b) => {
      if (a.spoed !== b.spoed) return a.spoed ? -1 : 1;
      return a.created_at.localeCompare(b.created_at);
    }),
  leesFotoBlob: async () => undefined,
  verwijderUitQueue: async (id: string) => {
    m.removed.push(id);
    m.queue = m.queue.filter((q) => q.id !== id);
  },
  markeerStatus: async (
    id: string,
    status: QueueMelding["status"],
    opts: { pogingen?: number } = {},
  ) => {
    m.statusUpdates.push({ id, status, pogingen: opts.pogingen });
    const e = m.queue.find((q) => q.id === id);
    if (e) {
      e.status = status;
      if (opts.pogingen !== undefined) e.pogingen = opts.pogingen;
    }
  },
}));

import { syncQueue } from "./sync";

function maakItem(over: Partial<QueueMelding> = {}): QueueMelding {
  return {
    id: over.id ?? "queue-1",
    opdracht_id: over.opdracht_id ?? "opd-1",
    spoed: over.spoed ?? false,
    ruwe_tekst: over.ruwe_tekst ?? "test",
    foto_urls: over.foto_urls ?? [],
    foto_local_ids: over.foto_local_ids ?? [],
    status: over.status ?? "wachtend",
    pogingen: over.pogingen ?? 0,
    created_at: over.created_at ?? "2026-05-30T12:00:00Z",
  };
}

beforeEach(() => {
  m.queue = [];
  m.removed = [];
  m.statusUpdates = [];
});

describe("syncQueue", () => {
  it("lege queue: niets te doen", async () => {
    const fetchMock = vi.fn();
    const res = await syncQueue(fetchMock as unknown as typeof fetch);
    expect(res).toEqual({ geprobeerd: 0, geslaagd: 0, mislukt: 0 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("een wachtend item zonder foto's: POST /api/meldingen, verwijdert uit queue", async () => {
    m.queue = [maakItem({ id: "q1", ruwe_tekst: "Front beschadigd" })];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "m-1" }), { status: 200 }),
    );

    const res = await syncQueue(fetchMock);
    expect(res).toEqual({ geprobeerd: 1, geslaagd: 1, mislukt: 0 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/meldingen");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.opdracht_id).toBe("opd-1");
    expect(body.ruwe_tekst).toBe("Front beschadigd");
    expect(m.removed).toContain("q1");
  });

  it("fail bij POST: status wordt 'wachtend' met pogingen=1", async () => {
    m.queue = [maakItem({ id: "q1" })];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("DB down", { status: 503 }),
    );

    const res = await syncQueue(fetchMock);
    expect(res).toEqual({ geprobeerd: 1, geslaagd: 0, mislukt: 1 });
    expect(m.removed).toHaveLength(0);
    const eind = m.statusUpdates.at(-1);
    expect(eind?.status).toBe("wachtend");
    expect(eind?.pogingen).toBe(1);
  });

  it("na 3x falen: status wordt 'mislukt' en wordt niet meer geprobeerd", async () => {
    m.queue = [maakItem({ id: "q1", pogingen: 2 })];
    const fetchMock = vi.fn().mockResolvedValue(
      new Response("DB down", { status: 503 }),
    );

    const res = await syncQueue(fetchMock);
    expect(res.mislukt).toBe(1);
    const eind = m.statusUpdates.at(-1);
    expect(eind?.status).toBe("mislukt");
    expect(eind?.pogingen).toBe(3);

    // Volgende run negeert het mislukte item
    fetchMock.mockClear();
    const res2 = await syncQueue(fetchMock);
    expect(res2.geprobeerd).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("spoed-items worden eerst geprobeerd", async () => {
    m.queue = [
      maakItem({ id: "q-gewoon", spoed: false, created_at: "2026-05-30T10:00:00Z" }),
      maakItem({ id: "q-spoed", spoed: true, created_at: "2026-05-30T11:00:00Z" }),
    ];
    const volgorde: string[] = [];
    const fetchMock = vi.fn().mockImplementation((_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string);
      volgorde.push(body.opdracht_id);
      return Promise.resolve(new Response(JSON.stringify({ id: "m" }), { status: 200 }));
    });

    await syncQueue(fetchMock);
    // Beide bij `opd-1`, dus we kijken op id-volgorde via removed-array
    expect(m.removed).toEqual(["q-spoed", "q-gewoon"]);
  });
});
