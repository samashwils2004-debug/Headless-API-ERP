import React from 'react';
import { cn } from '../ui/utils';

interface TerminalProps {
  command: string;
  onCopy?: () => void;
  className?: string;
}

export function Terminal({ command, onCopy, className }: TerminalProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    onCopy?.();
  };

  return (
    <div
      className={cn(
        'flex items-center justify-between bg-brand-surface border border-brand-border rounded-lg px-4 py-3',
        className
      )}
    >
      <code className="font-mono text-sm text-gray-300">{command}</code>
      <button
        onClick={handleCopy}
        className="px-3 py-1 bg-brand-purple hover:bg-brand-purple-light text-white text-xs rounded transition-colors"
      >
        Copy
      </button>
    </div>
  );
}
