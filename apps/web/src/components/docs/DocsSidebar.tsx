'use client';
import React from 'react';
import { Link, useLocation } from 'react-router';
import { Search, ChevronDown } from 'lucide-react';
import * as Accordion from '@radix-ui/react-accordion';
import { docsNavigation } from '../../data/docsNavigation';
import { DocNavItem } from '../../types';

export function DocsSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[280px] bg-docs-sidebar border-r border-docs-border overflow-y-auto scrollbar-thin">
      <div className="p-6">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2 mb-6">
          <span className="font-mono text-lg font-bold text-gray-900">
            admit<span className="text-brand-purple">/</span>flow
          </span>
        </Link>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search docs..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-docs-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20"
          />
        </div>

        {/* Navigation */}
        <Accordion.Root type="multiple" defaultValue={docsNavigation.map((_, i) => `section-${i}`)}>
          {docsNavigation.map((section, index) => (
            <NavSection key={index} section={section} index={index} currentPath={location.pathname} />
          ))}
        </Accordion.Root>
      </div>
    </aside>
  );
}

function NavSection({
  section,
  index,
  currentPath,
}: {
  section: DocNavItem;
  index: number;
  currentPath: string;
}) {
  return (
    <Accordion.Item value={`section-${index}`} className="mb-4">
      <Accordion.Trigger className="flex items-center justify-between w-full text-left text-xs font-semibold text-gray-900 uppercase tracking-wider mb-2 hover:text-brand-purple transition-colors group">
        {section.label}
        <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180" />
      </Accordion.Trigger>
      <Accordion.Content className="space-y-1">
        {section.children?.map((item, itemIndex) => {
          const isActive = item.href === currentPath;
          return (
            <Link
              key={itemIndex}
              to={item.href || '#'}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-brand-purple/10 text-brand-purple font-medium border-l-2 border-brand-purple'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </Accordion.Content>
    </Accordion.Item>
  );
}
