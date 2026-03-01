import "./globals.css";
import type { Metadata } from "next";
import React from "react";

import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Orquestra - Institutional Workflow Infrastructure",
  description:
    "Programmable institutional workflow infrastructure. Define deterministic state machines and deploy versioned runtime logic.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ background: "#0f0f12" }}>
      <body style={{ background: "#0f0f12", color: "#f4f4f5" }}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
