"use client";

import { ThemeProvider } from "@/components/providers/theme-provider";

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider forcedTheme="light" defaultTheme="light" enableSystem={false}>
      {children}
    </ThemeProvider>
  );
}

