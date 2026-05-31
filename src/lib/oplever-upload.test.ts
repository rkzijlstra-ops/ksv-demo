import { describe, it, expect } from "vitest";
import { videoExtensie, videoOpslagPad, storageUploadUrl } from "./oplever-upload";

describe("storageUploadUrl", () => {
  it("bouwt de storage object-URL", () => {
    expect(storageUploadUrl("https://x.supabase.co", "oplever-videos", "a.mp4")).toBe(
      "https://x.supabase.co/storage/v1/object/oplever-videos/a.mp4",
    );
  });
  it("haalt een dubbele slash weg", () => {
    expect(storageUploadUrl("https://x.supabase.co/", "b", "c.mov")).toBe(
      "https://x.supabase.co/storage/v1/object/b/c.mov",
    );
  });
});

describe("videoExtensie", () => {
  it("haalt de extensie uit de bestandsnaam", () => {
    expect(videoExtensie("rondje.mov", "video/quicktime")).toBe("mov");
    expect(videoExtensie("clip.MP4", "video/mp4")).toBe("mp4");
  });

  it("valt terug op content-type als de naam geen extensie heeft", () => {
    expect(videoExtensie("video", "video/quicktime")).toBe("mov");
    expect(videoExtensie("video", "video/webm")).toBe("webm");
    expect(videoExtensie("video", "video/mp4")).toBe("mp4");
  });

  it("default naar mp4 bij onbekend", () => {
    expect(videoExtensie("video", "application/octet-stream")).toBe("mp4");
  });
});

describe("videoOpslagPad", () => {
  it("combineert uuid en extensie", () => {
    expect(videoOpslagPad("abc-123", "rondje.mov", "video/quicktime")).toBe("abc-123.mov");
    expect(videoOpslagPad("xyz", "geen-ext", "video/mp4")).toBe("xyz.mp4");
  });
});
