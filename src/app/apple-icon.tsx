import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Maskable: inhoud in de veilige zone (midden), geen randelementen die weggesneden worden.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#27272a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="110" height="110" viewBox="0 0 192 192" fill="none">
          <path
            d="M48 100 l30 32 l66 -74"
            stroke="#ffffff"
            strokeWidth="18"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
