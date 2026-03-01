'use client';
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Slider } from '../ui/slider';

interface WorkflowSliderProps {
  score: number;
  onChange: (value: number) => void;
  activePath: 'accept' | 'review';
}

export function WorkflowSlider({ score, onChange, activePath }: WorkflowSliderProps) {
  return (
    <div className="bg-brand-bg border border-brand-border rounded-xl p-8">
      {/* Score Display */}
      <div className="text-center mb-8">
        <div className="text-sm text-gray-400 mb-2">Application Score</div>
        <div className="font-mono text-6xl font-bold text-white">{score}</div>
      </div>

      {/* Slider */}
      <div className="mb-8 px-2">
        <Slider
          value={[score]}
          onValueChange={([value]) => onChange(value)}
          min={0}
          max={100}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Decision Badge */}
      <AnimatePresence mode="wait">
        {activePath === 'accept' ? (
          <motion.div
            key="accept"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center"
          >
            <div className="text-green-500 font-semibold mb-1">→ Auto Accepted</div>
            <div className="text-xs text-gray-400">Application automatically approved</div>
          </motion.div>
        ) : (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center"
          >
            <div className="text-yellow-500 font-semibold mb-1">→ Under Review</div>
            <div className="text-xs text-gray-400">Requires human review</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Score Simulation */}
      <div className="mt-6 p-4 bg-brand-surface rounded-lg">
        <div className="text-xs text-gray-400 mb-2">AI Screening (Ollama)</div>
        <div className="font-mono text-xs text-gray-300">
          GPA: 3.8 → +30
          <br />
          SAT: 1450 → +25
          <br />
          Essays: Strong → +{score >= 90 ? 35 : 30}
          <br />
          <span className="text-brand-purple">Total: {score}</span>
        </div>
      </div>
    </div>
  );
}
