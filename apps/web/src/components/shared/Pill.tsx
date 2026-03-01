import React from 'react';
import { cn } from '../ui/utils';

interface PillProps {
  children: React.ReactNode;
  variant?: 'purple' | 'green' | 'yellow' | 'red' | 'blue';
  className?: string;
}

export function Pill({ children, variant = 'purple', className }: PillProps) {
  const variants = {
    purple: 'bg-brand-purple/10 text-brand-purple border-brand-purple/20',
    green: 'bg-green-500/10 text-green-600 border-green-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-600 border-red-500/20',
    blue: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
