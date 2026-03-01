import React from 'react';
import { cn } from '../ui/utils';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div className={cn('text-sm font-semibold text-brand-purple uppercase tracking-wider mb-3', className)}>
      {children}
    </div>
  );
}
