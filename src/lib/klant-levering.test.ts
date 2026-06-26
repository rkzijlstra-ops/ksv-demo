import { describe, it, expect } from "vitest";
import { magKlantLeveren } from "./klant-levering";

describe("magKlantLeveren", () => {
  it("eigen klus (geen opdrachtgever) mag altijd aan de klant", () => {
    expect(magKlantLeveren({ opdrachtgever_id: null }, null)).toBe(true);
  });

  it("opdrachtgever-klus mag als de opdrachtgever klant-levering toestaat", () => {
    expect(
      magKlantLeveren({ opdrachtgever_id: "zaak-1" }, { klant_levering_toegestaan: true }),
    ).toBe(true);
  });

  it("opdrachtgever-klus mag niet als de opdrachtgever het uit heeft staan", () => {
    expect(
      magKlantLeveren({ opdrachtgever_id: "zaak-1" }, { klant_levering_toegestaan: false }),
    ).toBe(false);
  });

  it("opdrachtgever-klus zonder gevonden opdrachtgever: veilig nee", () => {
    expect(magKlantLeveren({ opdrachtgever_id: "zaak-1" }, null)).toBe(false);
  });
});
