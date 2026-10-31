"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

// The game ships one light theme (the mockups have no dark variant), so the
// provider is pinned to light and ignores the system preference.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
