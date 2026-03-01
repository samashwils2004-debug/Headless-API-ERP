'use client';
import React from 'react';
import { useRef } from 'react';
import { Zap, Shield, FileText, GitBranch, Database, Bell } from 'lucide-react';
import { motion, useInView } from 'motion/react';

const features = [
  {
    icon: GitBranch,
    title: 'Workflow-as-Code',
    description: 'Define complex approval flows in JSON. Version control your business logic.',
  },
  {
    icon: Zap,
    title: 'AI-Powered Screening',
    description: 'Ollama integration analyzes essays, GPAs, and test scores in real-time.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'JWT auth, RBAC, audit trails, and IDOR protection built-in.',
  },
  {
    icon: FileText,
    title: 'Document Management',
    description: 'Secure upload and storage for transcripts, essays, and recommendations.',
  },
  {
    icon: Database,
    title: 'Full Audit Trail',
    description: 'Every state change, decision, and action is logged and traceable.',
  },
  {
    icon: Bell,
    title: 'Real-time Notifications',
    description: 'Applicants and reviewers get instant updates on status changes.',
  },
];

export function FeatureGrid() {
  return (
    <section className="py-20 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="text-sm font-semibold text-brand-purple uppercase tracking-wider mb-3">Features</div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Everything You Need, Nothing You Don't</h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Purpose-built for university admissions teams who want automation without losing control.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, index }: { feature: (typeof features)[0]; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const Icon = feature.icon;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="bg-brand-surface border border-brand-border rounded-xl p-6 hover:border-brand-purple/30 transition-all"
    >
      <div className="w-12 h-12 bg-brand-purple/10 rounded-lg flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-brand-purple" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
      <p className="text-sm text-gray-400">{feature.description}</p>
    </motion.div>
  );
}