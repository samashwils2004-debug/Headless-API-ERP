import Link from "next/link";
import { Book, ShieldCheck, Code2, Home } from "lucide-react";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col" style={{ color: "#f4f4f5" }}>
      <AnnouncementBar />
      <LandingNav />
      {/* 100px top padding (40px announcement + ~60px nav) */}
      <div className="flex flex-1 flex-col md:flex-row pt-[100px]">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 flex-none border-b md:border-b-0 md:border-r border-[var(--border-default)] bg-[var(--bg-secondary)] py-6 px-4 h-[calc(100vh-100px)] sticky top-[100px] overflow-y-auto">

          <nav className="space-y-1">
            <Link href="/docs/introduction" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1e1e24] rounded-md transition-colors">
              <Book size={16} /> Introduction
            </Link>
            <Link href="/docs/security" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1e1e24] rounded-md transition-colors">
              <ShieldCheck size={16} /> Data Security & Isolation
            </Link>
            <Link href="/docs/api-reference" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-[#1e1e24] rounded-md transition-colors">
              <Code2 size={16} /> API Reference
            </Link>

            <div className="pt-8 mt-8 border-t border-[var(--border-default)]">
              <Link href="/" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-[#1e1e24] rounded-md transition-colors">
                <Home size={16} /> Back to Hub
              </Link>
            </div>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div className="flex-1 max-w-4xl mx-auto w-full px-6 py-12 md:px-12 md:py-16 prose prose-invert prose-blue">
            {children}
          </div>
          <LandingFooter />
        </main>
      </div>
    </div>
  );
}
