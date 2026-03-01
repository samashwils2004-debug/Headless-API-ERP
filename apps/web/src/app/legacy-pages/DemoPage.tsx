'use client';
import React from 'react';
import { useEffect, useState, startTransition } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { ApiTab } from '@/types';
import { CodeBlock } from '@/components/docs/CodeBlock';
import { ConsoleOutput } from '@/components/interactive/ConsoleOutput';
import { LogEntry } from '@/types';
import { createSupabaseClientWithBearer } from '../../lib/supabase';
import { fetchSupabaseBrokerToken, getBackendAccessToken } from '../../lib/supabaseSession';

const apiTabs: ApiTab[] = [
  {
    id: 'submit',
    label: 'Submit Application',
    method: 'POST',
    endpoint: '/api/applications',
    description: 'Submit a new application with student information',
    requestBody: JSON.stringify(
      {
        student_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        gpa: 3.8,
        sat_score: 1450,
        essay: 'My passion for computer science...',
      },
      null,
      2
    ),
    mockResponse: JSON.stringify(
      {
        application_id: 'APP-2024-12345',
        status: 'submitted',
        workflow_state: 'SUBMITTED',
        ai_score: 92,
        decision: 'AUTO_ACCEPTED',
        timestamp: '2026-02-17T14:30:00Z',
      },
      null,
      2
    ),
  },
  {
    id: 'get',
    label: 'Get Application',
    method: 'GET',
    endpoint: '/api/applications/{id}',
    description: 'Retrieve application details by ID',
    requestBody: '',
    mockResponse: JSON.stringify(
      {
        application_id: 'APP-2024-12345',
        student_name: 'Jane Smith',
        status: 'auto_accepted',
        ai_score: 92,
        created_at: '2026-02-17T14:30:00Z',
        updated_at: '2026-02-17T14:30:05Z',
      },
      null,
      2
    ),
  },
  {
    id: 'workflow',
    label: 'Get Workflow State',
    method: 'GET',
    endpoint: '/api/workflows/{application_id}',
    description: 'Retrieve current workflow state and history',
    requestBody: '',
    mockResponse: JSON.stringify(
      {
        current_state: 'AUTO_ACCEPTED',
        history: [
          { state: 'SUBMITTED', timestamp: '2026-02-17T14:30:00Z', user: 'system' },
          { state: 'AI_SCREENING', timestamp: '2026-02-17T14:30:02Z', user: 'system' },
          { state: 'AUTO_ACCEPTED', timestamp: '2026-02-17T14:30:05Z', user: 'system' },
        ],
      },
      null,
      2
    ),
  },
];

export function DemoPage() {
  const [activeTab, setActiveTab] = useState('submit');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [logs] = useState<LogEntry[]>([
    { message: 'API Demo Ready', type: 'system', timestamp: Date.now() },
  ]);
  const [recentApplications, setRecentApplications] = useState<Array<Record<string, unknown>>>([]);
  const [supabaseMessage, setSupabaseMessage] = useState<string>('Supabase direct-read not initialized.');

  useEffect(() => {
    const enableRealtime = (process.env.NEXT_PUBLIC_ENABLE_REALTIME as string | undefined) === 'true';
    void enableRealtime; // Reserved for optional realtime phase.

    const loadRecentApplications = async () => {
      const apiBaseUrl = (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined) ?? '';
      const backendToken = getBackendAccessToken();
      if (!apiBaseUrl || !backendToken) {
        setSupabaseMessage('Missing VITE_API_BASE_URL or backend access_token in localStorage.');
        return;
      }

      try {
        const broker = await fetchSupabaseBrokerToken(apiBaseUrl, backendToken);
        const supabase = createSupabaseClientWithBearer(broker.access_token);
        const { data, error } = await supabase
          .from('recent_applications')
          .select('*')
          .limit(10);
        if (error) {
          setSupabaseMessage(`Supabase read failed: ${error.message}`);
          return;
        }
        setRecentApplications(data ?? []);
        setSupabaseMessage('Supabase direct-read loaded from recent_applications.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setSupabaseMessage(`Supabase unavailable: ${msg}`);
      }
    };

    void loadRecentApplications();
  }, []);

  const handleSendRequest = (tabId: string, response: string) => {
    setLoading((prev) => ({ ...prev, [tabId]: true }));

    startTransition(() => {
      setTimeout(() => {
        setResponses((prev) => ({ ...prev, [tabId]: response }));
        setLoading((prev) => ({ ...prev, [tabId]: false }));
      }, 800);
    });
  };

  const currentTab = apiTabs.find((tab) => tab.id === activeTab);

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Header Section */}
      <div className="bg-brand-surface border-b border-brand-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-white mb-4">Interactive API Demo</h1>
          <p className="text-lg text-gray-400">
            Test Orquestra's REST API endpoints with live examples. All responses are mocked for demonstration.
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-brand-surface border border-brand-border rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-white mb-2">Supabase Direct Read (RLS)</h2>
          <p className="text-sm text-gray-400 mb-3">{supabaseMessage}</p>
          <p className="text-sm text-gray-300">
            Rows loaded: <span className="font-mono">{recentApplications.length}</span>
          </p>
        </div>

        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List className="flex gap-2 border-b border-gray-700 mb-8">
            {apiTabs.map((tab) => (
              <Tabs.Trigger
                key={tab.id}
                value={tab.id}
                className="px-4 py-3 text-sm font-medium text-gray-400 border-b-2 border-transparent hover:text-white hover:border-brand-purple transition-all data-[state=active]:text-brand-purple data-[state=active]:border-brand-purple"
              >
                {tab.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          {apiTabs.map((tab) => (
            <Tabs.Content key={tab.id} value={tab.id} className="space-y-6">
              {/* Endpoint Info */}
              <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                      tab.method === 'GET'
                        ? 'bg-blue-500/20 text-blue-400'
                        : tab.method === 'POST'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-purple-500/20 text-purple-400'
                    }`}
                  >
                    {tab.method}
                  </span>
                  <code className="font-mono text-sm text-gray-300">{tab.endpoint}</code>
                </div>
                <p className="text-sm text-gray-400">{tab.description}</p>
              </div>

              {/* Request/Response Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Request */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Request</h3>
                  {tab.requestBody ? (
                    <CodeBlock code={tab.requestBody} language="json" title="Request Body" />
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
                      No request body required
                    </div>
                  )}
                  <button
                    onClick={() => handleSendRequest(tab.id, tab.mockResponse)}
                    disabled={loading[tab.id]}
                    className="mt-4 px-6 py-3 bg-brand-purple hover:bg-brand-purple-light disabled:opacity-50 text-white rounded-lg transition-colors font-medium"
                  >
                    {loading[tab.id] ? 'Sending...' : 'Send Request'}
                  </button>
                </div>

                {/* Response */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Response</h3>
                  {responses[tab.id] ? (
                    <CodeBlock code={responses[tab.id]} language="json" title="Response (200 OK)" />
                  ) : (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-sm text-gray-400">
                      Click "Send Request" to see the response
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow Console for Submit Application */}
              {tab.id === 'submit' && responses[tab.id] && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Workflow Console Output</h3>
                  <ConsoleOutput logs={logs} />
                </div>
              )}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
    </div>
  );
}
