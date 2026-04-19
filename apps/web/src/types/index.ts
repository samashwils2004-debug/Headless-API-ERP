export * from "./contracts";

// WorkflowState is defined in contracts.ts — do not redefine here.
// The contracts.ts version is the canonical shape (type + transitions with emit_event).

export interface ApiTab {
  id: string;
  label: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  requestBody: string;
  mockResponse: string;
  description: string;
}

export interface DocNavItem {
  label: string;
  href?: string;
  children?: DocNavItem[];
}

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warn' | 'system';
  timestamp: number;
}

export interface HeadingItem {
  id: string;
  text: string;
  level: 2 | 3;
}
