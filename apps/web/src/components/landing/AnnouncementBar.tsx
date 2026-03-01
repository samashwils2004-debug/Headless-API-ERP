import Link from "next/link";

export function AnnouncementBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-10 border-b border-[var(--border-default)] bg-[var(--bg-secondary)]">
      <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between px-4 text-xs text-[var(--text-secondary)] sm:px-6">
        <span>AdmitFlow Infrastructure Preview</span>
        <Link href="/docs/introduction" className="text-[var(--text-primary)] underline underline-offset-4">
          Read Product Model
        </Link>
      </div>
    </div>
  );
}
