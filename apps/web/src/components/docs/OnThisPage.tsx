'use client';
import React from 'react';
import { useEffect, useState } from 'react';
import { HeadingItem } from '../../types';

interface OnThisPageProps {
  headings: HeadingItem[];
}

export function OnThisPage({ headings }: OnThisPageProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: '-100px 0px -80% 0px' }
    );

    headings.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => observer.disconnect();
  }, [headings]);

  const handleClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (headings.length === 0) return null;

  return (
    <aside className="sticky top-20 w-[240px] h-[calc(100vh-5rem)] overflow-y-auto scrollbar-thin">
      <div className="p-6">
        <div className="text-xs font-semibold text-gray-900 uppercase tracking-wider mb-4">On This Page</div>
        <ul className="space-y-2">
          {headings.map((heading) => (
            <li key={heading.id}>
              <button
                onClick={() => handleClick(heading.id)}
                className={`block w-full text-left text-sm transition-colors ${
                  heading.level === 3 ? 'pl-3' : ''
                } ${
                  activeId === heading.id
                    ? 'text-brand-purple font-medium'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {heading.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
