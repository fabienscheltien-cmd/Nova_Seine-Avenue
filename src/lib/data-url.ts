/**
 * Décode une image « data:image/…;base64,… » ; null sinon.
 * Formats matriciels uniquement : un SVG peut contenir du script.
 */
export function decodeImageDataUrl(dataUrl: string | null | undefined): { type: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const match = dataUrl?.match(/^data:(image\/(?:webp|jpeg|png|gif));base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;
  try {
    return { type: match[1]!.toLowerCase(), bytes: Uint8Array.from(atob(match[2]!.replace(/\s/g, "")), (c) => c.charCodeAt(0)) };
  } catch {
    return null;
  }
}
