import React from "react";

import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingNav } from "@/components/landing/LandingNav";

export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <AnnouncementBar />
      <LandingNav />
      {children}
    </div>
  );
}
