'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WorkflowSlider } from './WorkflowSlider';
import { ConsoleOutput } from './ConsoleOutput';
import { JsonViewer } from '../shared/JsonViewer';
import { LogEntry } from '../../types';

export function WorkflowVisualizer() {
  const [score, setScore] = useState(85);
  const [activePath, setActivePath] = useState<'accept' | 'review'>('review');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    const now = Date.now();
    setLogs([
      { message: 'Workflow engine initialized', type: 'system', timestamp: now },
      { message: 'Application submitted: APP-2024-001', type: 'info', timestamp: now + 100 },
    ]);
  }, []);

  const handleScoreChange = (newScore: number) => {
    setScore(newScore);
    const newPath = newScore >= 90 ? 'accept' : 'review';
    setActivePath(newPath);

    // Add log entry
    const newLog: LogEntry = {
      message:
        newScore >= 90
          ? `✓ Score ${newScore} → AUTO_ACCEPT (threshold: 90)`
          : `⚠ Score ${newScore} → UNDER_REVIEW (threshold: 90)`,
      type: newScore >= 90 ? 'success' : 'warn',
      timestamp: Date.now(),
    };

    setLogs((prev) => [...prev, newLog]);
  };

  const workflowDefinition = {
    states: {
      submitted: {
        transitions: [
          { to: 'auto_accepted', condition: 'score >= 90' },
          { to: 'under_review', condition: 'score < 90' },
        ],
      },
    },
  };

  return (
    <section className="py-20 bg-brand-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-sm font-semibold text-brand-purple uppercase tracking-wider mb-3">
            Workflow Engine
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            State Machines That Actually Make Sense
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Watch how a single score determines the entire application path. Move the slider to see transitions in
            real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Left: SVG State Machine */}
          <div className="bg-brand-bg border border-brand-border rounded-xl p-8">
            <StateMachineSVG activePath={activePath} score={score} />
          </div>

          {/* Right: Controls */}
          <div className="space-y-6">
            <WorkflowSlider score={score} onChange={handleScoreChange} activePath={activePath} />
          </div>
        </div>

        {/* Console Output */}
        <ConsoleOutput logs={logs} />

        {/* JSON Definition */}
        <div className="mt-8">
          <h3 className="text-xl font-semibold text-white mb-4">Workflow Definition (JSON)</h3>
          <JsonViewer data={JSON.stringify(workflowDefinition, null, 2)} highlightKey="90" />
        </div>
      </div>
    </section>
  );
}

function StateMachineSVG({ activePath, score }: { activePath: 'accept' | 'review'; score: number }) {
  return (
    <svg viewBox="0 0 400 300" className="w-full h-full">
      {/* Paths */}
      <g>
        {/* Path to Auto Accept */}
        <path
          d="M 200 80 Q 250 120 280 160"
          fill="none"
          stroke={activePath === 'accept' ? '#10b981' : '#30363d'}
          strokeWidth="3"
          strokeDasharray={activePath === 'accept' ? '8 4' : '4 4'}
          className={activePath === 'accept' ? 'animate-flow-dash' : ''}
          markerEnd="url(#arrowhead-green)"
        />

        {/* Path to Under Review */}
        <path
          d="M 200 80 Q 150 120 120 160"
          fill="none"
          stroke={activePath === 'review' ? '#eab308' : '#30363d'}
          strokeWidth="3"
          strokeDasharray={activePath === 'review' ? '8 4' : '4 4'}
          className={activePath === 'review' ? 'animate-flow-dash' : ''}
          markerEnd="url(#arrowhead-yellow)"
        />

        {/* Condition Labels */}
        <text x="240" y="110" className="text-xs fill-gray-400" fontSize="10">
          score ≥ 90
        </text>
        <text x="110" y="110" className="text-xs fill-gray-400" fontSize="10">
          score &lt; 90
        </text>
      </g>

      {/* Nodes */}
      <g>
        {/* Submitted Node */}
        <circle cx="200" cy="80" r="30" fill="#7c3aed" className="animate-node-pulse" />
        <text x="200" y="70" textAnchor="middle" className="text-xs fill-white" fontSize="10">
          SUBMITTED
        </text>
        <text x="200" y="85" textAnchor="middle" className="text-xs fill-white font-bold" fontSize="12">
          {score}
        </text>

        {/* Auto Accepted Node */}
        <circle
          cx="280"
          cy="160"
          r="30"
          fill={activePath === 'accept' ? '#10b981' : '#30363d'}
          className={activePath === 'accept' ? 'animate-node-pulse' : ''}
        />
        <text
          x="280"
          y="160"
          textAnchor="middle"
          className={`text-xs ${activePath === 'accept' ? 'fill-white' : 'fill-gray-600'}`}
          fontSize="9"
        >
          AUTO
        </text>
        <text
          x="280"
          y="170"
          textAnchor="middle"
          className={`text-xs ${activePath === 'accept' ? 'fill-white' : 'fill-gray-600'}`}
          fontSize="9"
        >
          ACCEPTED
        </text>

        {/* Under Review Node */}
        <circle
          cx="120"
          cy="160"
          r="30"
          fill={activePath === 'review' ? '#eab308' : '#30363d'}
          className={activePath === 'review' ? 'animate-node-pulse' : ''}
        />
        <text
          x="120"
          y="160"
          textAnchor="middle"
          className={`text-xs ${activePath === 'review' ? 'fill-white' : 'fill-gray-600'}`}
          fontSize="9"
        >
          UNDER
        </text>
        <text
          x="120"
          y="170"
          textAnchor="middle"
          className={`text-xs ${activePath === 'review' ? 'fill-white' : 'fill-gray-600'}`}
          fontSize="9"
        >
          REVIEW
        </text>
      </g>

      {/* Arrow Markers */}
      <defs>
        <marker
          id="arrowhead-green"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#10b981" />
        </marker>
        <marker
          id="arrowhead-yellow"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon points="0 0, 10 3, 0 6" fill="#eab308" />
        </marker>
      </defs>
    </svg>
  );
}
