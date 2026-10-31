import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Secret Santa Bialto";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

// Link preview card: title on the brand green with the yellow ribbon. The
// default font has no Cyrillic, so the card is in Latin letters only (no
// custom font is chosen yet). Metadata images are exempt from the token rule.
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: "#183d26",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 36,
      }}
    >
      <div
        style={{
          fontSize: 112,
          fontWeight: 700,
          color: "#ffffff",
          letterSpacing: "-2px",
        }}
      >
        Secret Santa
      </div>
      <div
        style={{
          background: "#fff000",
          color: "#183d26",
          fontSize: 56,
          fontWeight: 700,
          padding: "14px 56px",
          borderRadius: 999,
        }}
      >
        Bialto
      </div>
    </div>,
    { ...size },
  );
}
