import React from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { StatCounters } from '@/components/landing/StatCounters';
import { WorkflowVisualizer } from '@/components/interactive/WorkflowVisualizer';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { LandingFooter } from '@/components/landing/LandingFooter';

export function LandingPage() {
  return (
    <>
      <HeroSection />
      <StatCounters />
      <WorkflowVisualizer />
      <FeatureGrid />
      <LandingFooter />
    </>
  );
}
