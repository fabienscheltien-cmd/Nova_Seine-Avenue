import { describe, expect, it } from "vitest";
import { decodeImageDataUrl } from "./data-url";

describe("decodeImageDataUrl", () => {
  it("décode une image en base64", () => {
    const out = decodeImageDataUrl("data:image/webp;base64,UklGRg==");
    expect(out?.type).toBe("image/webp");
    expect(Array.from(out!.bytes)).toEqual([82, 73, 70, 70]); // « RIFF »
  });

  it("refuse ce qui n'est pas une image ou est mal formé", () => {
    expect(decodeImageDataUrl("data:text/html;base64,PGgxPg==")).toBeNull();
    expect(decodeImageDataUrl("data:image/svg+xml;base64,PHN2Zz4=")).toBeNull();
    expect(decodeImageDataUrl("data:image/png;base64,@@@")).toBeNull();
    expect(decodeImageDataUrl("https://exemple.fr/a.png")).toBeNull();
    expect(decodeImageDataUrl(null)).toBeNull();
  });
});
