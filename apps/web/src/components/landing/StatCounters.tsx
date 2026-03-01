import React from 'react';
import { StatCounter } from '../interactive/StatCounter';

export function StatCounters() {
  const stats = [
    {
      label: 'Processing Time',
      beforeValue: '3-5 days',
      afterValue: '< 1 sec',
      beforeLabel: 'Manual review per application',
      afterLabel: 'Automated decision',
    },
    {
      label: 'Staff Hours',
      beforeValue: '200 hrs',
      afterValue: '8 hrs',
      beforeLabel: 'Per 1000 applications',
      afterLabel: 'Only edge cases',
    },
    {
      label: 'Error Rate',
      beforeValue: '4.2%',
      afterValue: '0.1%',
      beforeLabel: 'Human mistakes',
      afterLabel: 'Workflow engine',
    },
  ];

  return (
    <section className="py-20 bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Impact Metrics</h2>
          <p className="text-lg text-gray-400">Real improvements from workflow automation</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat, index) => (
            <StatCounter key={index} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}
