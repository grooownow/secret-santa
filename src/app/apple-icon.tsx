import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Home-screen icon (iOS ignores SVG favicons): the same green lucide "gift"
// on the light brand green as src/app/icon.svg. Metadata images are exempt from
// the token rule (docs/rules/frontend.md).
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        background: "#b8eca2",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        width="112"
        height="112"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#235a32"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 7v14" />
        <path d="M20 11v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8" />
        <path d="M7.5 7a1 1 0 0 1 0-5A4.8 8 0 0 1 12 7a4.8 8 0 0 1 4.5-5 1 1 0 0 1 0 5" />
        <rect x="3" y="7" width="18" height="4" rx="1" />
      </svg>
    </div>,
    size,
  );
}
