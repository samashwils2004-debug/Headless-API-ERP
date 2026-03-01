import React from "react";

import { LandingNav } from "@/components/landing/LandingNav";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <LandingNav />
      {children}
    </div>
  );
}
