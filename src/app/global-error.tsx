"use client";

// global-error replaces the ROOT layout when it (or anything above the
// nearest error boundary) throws, so it must render its own <html><body> and
// cannot rely on layout.tsx, globals.css, ThemeProvider, or shadcn/ui — any
// of those could be the thing that failed. This is the one place in the app
// allowed to use inline styles instead of design tokens; token classes are
// mandatory everywhere else (see docs/rules/frontend.md).
//
// Dark mode here can't go through next-themes (it's part of the tree that
// may have failed), so we fall back to a plain CSS `prefers-color-scheme`
// media query via the inline <style> tag below — no JS, no imports, works
// even if the rest of the app is unrenderable.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="global-error-body"
        style={{
          margin: 0,
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
        }}
      >
        <style>{`
          .global-error-body {
            background: #fff;
            color: #111;
          }
          .global-error-text {
            color: #555;
          }
          .global-error-button {
            border-color: #111;
            background: #111;
            color: #fff;
          }
          @media (prefers-color-scheme: dark) {
            .global-error-body {
              background: #0a0a0a;
              color: #f5f5f5;
            }
            .global-error-text {
              color: #a3a3a3;
            }
            .global-error-button {
              border-color: #f5f5f5;
              background: #f5f5f5;
              color: #0a0a0a;
            }
          }
        `}</style>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p
          className="global-error-text"
          style={{ maxWidth: "32rem", fontSize: "0.875rem" }}
        >
          A critical error occurred and the app could not recover. You can try
          again, and if the problem persists, share the reference below with
          support.
        </p>
        {error.digest ? (
          <p
            className="global-error-text"
            style={{
              fontFamily: "monospace",
              fontSize: "0.75rem",
            }}
          >
            Reference: {error.digest}
          </p>
        ) : null}
        <button
          onClick={reset}
          className="global-error-button"
          style={{
            borderWidth: "1px",
            borderStyle: "solid",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
