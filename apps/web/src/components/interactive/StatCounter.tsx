'use client';
import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'motion/react';

interface StatCounterProps {
  label: string;
  beforeValue: string;
  afterValue: string;
  beforeLabel: string;
  afterLabel: string;
}

export function StatCounter({ label, beforeValue, afterValue, beforeLabel, afterLabel }: StatCounterProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5 }}
      className="relative bg-brand-surface border border-brand-border rounded-xl p-6 hover:border-brand-purple/30 transition-all cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className="text-sm text-gray-400 mb-2">{label}</div>

      <motion.div
        key={isFlipped ? 'after' : 'before'}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col"
      >
        {!isFlipped ? (
          <>
            <div className="text-3xl font-bold text-red-500 mb-1">{beforeValue}</div>
            <div className="text-xs text-gray-500">{beforeLabel}</div>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold text-green-500 mb-1">{afterValue}</div>
            <div className="text-xs text-gray-500">{afterLabel}</div>
          </>
        )}
      </motion.div>

      <div className="mt-4 text-xs text-gray-600">Click to toggle</div>
    </motion.div>
  );
}
