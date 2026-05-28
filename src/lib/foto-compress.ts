export interface Afmeting {
  width: number;
  height: number;
}

/**
 * Berekent doel-afmetingen zodat de langste zijde maxZijde niet overschrijdt.
 * Vergroot nooit (kleine foto's blijven gelijk). Rondt af op hele pixels.
 */
export function berekenSchaal(width: number, height: number, maxZijde: number): Afmeting {
  const langste = Math.max(width, height);
  if (langste <= maxZijde) return { width, height };
  const factor = maxZijde / langste;
  return {
    width: Math.round(width * factor),
    height: Math.round(height * factor),
  };
}

/**
 * Comprimeert een afbeelding in de browser via canvas.
 * Resize naar maxZijde (langste zijde) en exporteer als JPEG.
 * Alleen client-side bruikbaar (gebruikt Image, canvas, URL).
 */
export async function compressImage(
  file: File,
  maxZijde = 1500,
  kwaliteit = 0.8,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = berekenSchaal(bitmap.width, bitmap.height, maxZijde);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas niet beschikbaar");
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compressie mislukt"))),
      "image/jpeg",
      kwaliteit,
    );
  });
}
