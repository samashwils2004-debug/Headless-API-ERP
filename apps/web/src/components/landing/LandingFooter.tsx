import Link from "next/link";
import { Github, Twitter, Linkedin } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-[var(--border-default)] bg-[var(--bg-primary)] px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-12 lg:grid-cols-4">
          <div className="space-y-6 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 group mb-4">
              <svg width="28" height="28" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 bg-white rounded-md p-1">
                <rect x="16" y="16" width="8" height="8" fill="black" />
                <rect x="16" y="4" width="8" height="8" fill="black" opacity="0.7" />
                <rect x="28" y="16" width="8" height="8" fill="black" opacity="0.7" />
                <rect x="16" y="28" width="8" height="8" fill="black" opacity="0.7" />
                <rect x="4" y="16" width="8" height="8" fill="black" opacity="0.7" />
                <line x1="20" y1="12" x2="20" y2="16" stroke="black" strokeWidth="1.5" opacity="0.4" />
                <line x1="24" y1="20" x2="28" y2="20" stroke="black" strokeWidth="1.5" opacity="0.4" />
                <line x1="20" y1="24" x2="20" y2="28" stroke="black" strokeWidth="1.5" opacity="0.4" />
                <line x1="12" y1="20" x2="16" y2="20" stroke="black" strokeWidth="1.5" opacity="0.4" />
              </svg>
              <span className="text-lg font-semibold text-white tracking-tight">Orquestra</span>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed pr-8">
              AI-native institutional ERP infrastructure. Build, version, and deploy institutional workflows as code.
            </p>
            <div className="flex gap-4 text-gray-500">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Github size={20} /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Twitter size={20} /></a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors"><Linkedin size={20} /></a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider">Product</h4>
            <div className="flex flex-col space-y-3 text-sm text-gray-400">
              <Link href="#" className="hover:text-white transition-colors">Overview</Link>
              <Link href="#" className="hover:text-white transition-colors">Templates</Link>
              <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="#" className="hover:text-white transition-colors">Changelog</Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider">Developers</h4>
            <div className="flex flex-col space-y-3 text-sm text-gray-400">
              <Link href="/docs/introduction" className="hover:text-white transition-colors">Documentation</Link>
              <Link href="/architecture" className="hover:text-white transition-colors">Architecture</Link>
              <Link href="#" className="hover:text-white transition-colors">Guides</Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white tracking-wider">Company</h4>
            <div className="flex flex-col space-y-3 text-sm text-gray-400">
              <Link href="#" className="hover:text-white transition-colors">About</Link>
              <Link href="#" className="hover:text-white transition-colors">Blog</Link>
              <Link href="#" className="hover:text-white transition-colors">Careers</Link>
              <Link href="#" className="hover:text-white transition-colors">Contact</Link>
            </div>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--border-default)] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© 2024 Orquestra. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="#" className="hover:text-white transition-colors">Security</Link>
          </div>
        </div>
      </div>
    </footer >
  );
}
