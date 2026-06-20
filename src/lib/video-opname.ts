/**
 * Instellingen en pure helpers voor in-app video-opname. De opname gebeurt op
 * 1080p met een gecapte bitrate, zodat het bestand klein blijft (~37 MB/min) en
 * betrouwbaar uploadt vanaf de telefoon, in plaats van een 4K-bestand van
 * honderden MB uit de camera-app.
 */

/** getUserMedia-constraints: 1080p achtercamera met geluid. */
export const VIDEO_OPNAME_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: { ideal: "environment" },
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  },
  audio: true,
};

/** Doelbitrate: ~5 Mbps geeft 1080p van ruwweg 37 MB per minuut. */
export const VIDEO_BITS_PER_SECOND = 5_000_000;

/**
 * Boven deze grootte waarschuwen we bij een uit de galerij gekozen bestand. 100 MB ligt rond de plek
 * waar de upload op een gemiddelde mobiele verbinding boven de minuut komt; daaronder loont een
 * waarschuwing niet. Galerij-video's worden (anders dan de in-app opname) niet verkleind, dus een
 * 4K-bestand kan hier ruim overheen gaan.
 */
export const GROOT_BESTAND_BYTES = 100 * 1024 * 1024;

/** Voorkeursvolgorde van opname-formaten: mp4 eerst (breedst afspeelbaar), dan webm. */
const MIME_VOORKEUR = [
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

/**
 * Kiest het eerste opname-mimetype dat de browser ondersteunt. De support-check
 * wordt ingespoten zodat de functie los te testen is. Geeft undefined als niets
 * matcht, zodat de MediaRecorder zijn eigen default mag kiezen.
 */
export function kiesVideoMimeType(isSupported: (type: string) => boolean): string | undefined {
  return MIME_VOORKEUR.find(isSupported);
}

/** True als een bestand groot genoeg is om de monteur te waarschuwen. */
export function isGrootBestand(bytes: number): boolean {
  return bytes > GROOT_BESTAND_BYTES;
}

/** Bestandsgrootte als afgeronde MB, voor in meldingen. */
export function bytesNaarMB(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}
