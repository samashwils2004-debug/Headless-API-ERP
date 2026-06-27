import "./globals.css";
import "@xyflow/react/dist/style.css";
import type { Metadata, Viewport } from "next";
import React from "react";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Orquestra - Institutional Workflow Infrastructure",
  description:
    "Programmable institutional workflow infrastructure. Define deterministic state machines and deploy versioned runtime logic.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#0f0f12" }}>
      <body style={{ background: "#0f0f12", color: "#f4f4f5" }} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
