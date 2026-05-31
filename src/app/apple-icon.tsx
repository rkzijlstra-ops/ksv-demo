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
        <svg width="124" height="124" viewBox="0 0 192 192" fill="none">
          <rect x="52" y="46" width="88" height="104" rx="10" stroke="#ffffff" strokeWidth="10" strokeLinejoin="round" />
          <rect x="78" y="32" width="36" height="20" rx="6" fill="#ffffff" />
          <line x1="68" y1="82" x2="124" y2="82" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
          <line x1="68" y1="106" x2="124" y2="106" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
          <line x1="68" y1="128" x2="102" y2="128" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" />
          <circle cx="130" cy="134" r="26" fill="#f97316" />
          <path d="M118 134 l8 8 l16 -18" stroke="#ffffff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
