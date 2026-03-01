'use client';
import React from 'react';
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { LogEntry } from '../../types';

interface ConsoleOutputProps {
  logs: LogEntry[];
}

export function ConsoleOutput({ logs }: ConsoleOutputProps) {
  const consoleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warn':
        return 'text-yellow-400';
      case 'info':
        return 'text-blue-400';
      case 'system':
        return 'text-gray-500';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-gray-400 font-mono">workflow.log</span>
        </div>
      </div>
      <div ref={consoleRef} className="p-4 h-32 overflow-y-auto scrollbar-thin font-mono text-xs">
        {logs.map((log, index) => (
          <motion.div
            key={log.timestamp}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            className={`${getLogColor(log.type)} mb-1`}
          >
            <span className="text-gray-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span> {log.message}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
