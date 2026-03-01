"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

type CodeBlockProps = {
  code: string;
  language?: string;
  title?: string;
};

export function CodeBlock({ code, language = "typescript", title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-default)] px-3 py-2 text-xs text-[var(--text-secondary)]">
        <span>{title || language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded border border-[var(--border-default)] px-2 py-0.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          aria-label="Copy code"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-3 text-xs leading-6 text-[var(--text-secondary)]">
        <code>{code}</code>
      </pre>
    </div>
  );
}
