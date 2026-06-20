import { describe, it, expect, beforeEach } from "vitest";
import {
  zetFotoBezig,
  zetVideoBezig,
  leesUploadStatus,
  ietsUploadBezig,
  abonneerUploadStatus,
} from "./oplever-upload-status";

beforeEach(() => {
  zetFotoBezig(false);
  zetVideoBezig(false);
});

describe("oplever-upload-status", () => {
  it("begint leeg: niets bezig", () => {
    expect(leesUploadStatus()).toEqual({ fotoBezig: false, videoBezig: false });
    expect(ietsUploadBezig()).toBe(false);
  });

  it("houdt foto- en video-status los bij", () => {
    zetFotoBezig(true);
    expect(leesUploadStatus()).toEqual({ fotoBezig: true, videoBezig: false });
    expect(ietsUploadBezig()).toBe(true);

    zetVideoBezig(true);
    expect(leesUploadStatus()).toEqual({ fotoBezig: true, videoBezig: true });

    zetFotoBezig(false);
    expect(leesUploadStatus()).toEqual({ fotoBezig: false, videoBezig: true });
    expect(ietsUploadBezig()).toBe(true);
  });

  it("notificeert abonnees alleen bij een echte wijziging", () => {
    let n = 0;
    const uit = abonneerUploadStatus(() => {
      n += 1;
    });
    zetFotoBezig(true);
    zetFotoBezig(true); // zelfde waarde, geen notificatie
    expect(n).toBe(1);
    zetFotoBezig(false);
    expect(n).toBe(2);
    uit();
    zetFotoBezig(true);
    expect(n).toBe(2); // na afmelden geen notificatie meer
  });
});
