import React from 'react';
import { cn } from '../ui/utils';

interface JsonViewerProps {
  data: string | object;
  highlightKey?: string;
  className?: string;
}

export function JsonViewer({ data, highlightKey, className }: JsonViewerProps) {
  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  // Simple syntax highlighting
  const highlighted = jsonString
    .replace(/(".*?"):/g, '<span class="text-blue-400">$1</span>:')
    .replace(/: (".*?")/g, ': <span class="text-green-400">$1</span>')
    .replace(/: (\d+)/g, ': <span class="text-yellow-400">$1</span>')
    .replace(/: (true|false|null)/g, ': <span class="text-purple-400">$1</span>');

  // Highlight specific key if provided
  const finalHighlighted = highlightKey
    ? highlighted.replace(
        new RegExp(`(: )(${highlightKey})`, 'g'),
        '$1<span class="bg-blue-500/20 px-1 rounded">$2</span>'
      )
    : highlighted;

  return (
    <div className={cn('bg-gray-900 rounded-lg p-4 overflow-x-auto scrollbar-thin', className)}>
      <pre className="font-mono text-sm text-gray-300">
        <code dangerouslySetInnerHTML={{ __html: finalHighlighted }} />
      </pre>
    </div>
  );
}
