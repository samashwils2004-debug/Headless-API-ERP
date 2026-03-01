'use client';
import React from 'react';
import { Link } from 'react-router';
import { ArrowRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Terminal } from '../shared/Terminal';
import { Pill } from '../shared/Pill';
import { toast } from 'sonner';

export function HeroSection() {
  const handleCopy = () => {
    toast.success('Command copied to clipboard!');
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-brand-bg pt-16">
      {/* Decorative Background Shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 opacity-5">
        <svg viewBox="0 0 200 200" className="w-full h-full animate-float">
          <circle cx="100" cy="100" r="80" fill="currentColor" className="text-brand-purple" />
        </svg>
      </div>
      <div className="absolute top-20 right-0 w-96 h-96 opacity-5">
        <svg viewBox="0 0 200 200" className="w-full h-full animate-float" style={{ animationDelay: '-3s' }}>
          <path d="M 0 0 L 200 0 L 200 200 Z" fill="currentColor" className="text-brand-purple" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="flex justify-center mb-6">
          <Link to="/docs/workflow-engine">
            <Pill variant="purple" className="hover:bg-brand-purple/20 transition-colors cursor-pointer">
              <span className="font-semibold">NEW</span>
              <span>AI Application Screening — See how it works</span>
              <ArrowRight className="w-3 h-3" />
            </Pill>
          </Link>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          The Workflow-as-Code
          <br />
          Platform for
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-purple-light">
            University Admissions
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-lg sm:text-xl text-gray-400 mb-12 max-w-3xl mx-auto">
          Define complex application workflows in JSON. Auto-accept high-scoring applicants. Route edge cases to
          humans. All with full audit trails and enterprise security.
        </p>

        {/* CTA */}
        <div className="flex flex-col items-center gap-4 max-w-2xl mx-auto">
          <Terminal command="uvicorn app.main:app --reload" onCopy={handleCopy} className="w-full" />

          <div className="flex items-center gap-4 text-gray-400 text-sm">
            <div className="h-px w-16 bg-brand-border" />
            <span>OR</span>
            <div className="h-px w-16 bg-brand-border" />
          </div>

          <Link to="/docs/setup">
            <Button size="lg" className="bg-brand-purple hover:bg-brand-purple-light text-white px-8 py-6 text-lg">
              Get Started
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>

        {/* Metadata */}
        <p className="mt-8 text-sm text-gray-500">
          Open Source • MIT Licensed • Built with FastAPI, React & PostgreSQL
        </p>
      </div>
    </section>
  );
}
