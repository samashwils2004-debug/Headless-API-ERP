import React from 'react';
import { AlertCircle, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '../ui/utils';

interface AlertBoxProps {
  variant?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function AlertBox({ variant = 'info', title, children, className }: AlertBoxProps) {
  const variants = {
    info: {
      bg: 'bg-blue-50',
      border: 'border-l-4 border-blue-500',
      icon: Info,
      iconColor: 'text-blue-500',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-800',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-l-4 border-yellow-500',
      icon: AlertTriangle,
      iconColor: 'text-yellow-500',
      titleColor: 'text-yellow-900',
      textColor: 'text-yellow-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-l-4 border-red-500',
      icon: AlertCircle,
      iconColor: 'text-red-500',
      titleColor: 'text-red-900',
      textColor: 'text-red-800',
    },
    success: {
      bg: 'bg-green-50',
      border: 'border-l-4 border-green-500',
      icon: CheckCircle,
      iconColor: 'text-green-500',
      titleColor: 'text-green-900',
      textColor: 'text-green-800',
    },
  };

  const config = variants[variant];
  const Icon = config.icon;

  return (
    <div className={cn('rounded-lg p-4', config.bg, config.border, className)}>
      <div className="flex gap-3">
        <Icon className={cn('w-5 h-5 mt-0.5 flex-shrink-0', config.iconColor)} />
        <div className="flex-1">
          {title && <div className={cn('font-semibold mb-1', config.titleColor)}>{title}</div>}
          <div className={cn('text-sm', config.textColor)}>{children}</div>
        </div>
      </div>
    </div>
  );
}
