import { NextRequest, NextResponse } from "next/server";

// ── Types ─────────────────────────────────────────────────────────────────

type DomainInput = {
  id: string;
  label: string;
  color?: string;
  workflow_name?: string;
};

type StitchGenerateBody = {
  system_name: string;
  domains: DomainInput[];
  stitch_project_id?: string;
};

export type StitchScreen = {
  html: string;
  image_url: string;
  screen_id: string;
};

export type StitchGeneratePayload = {
  project_id: string;
  screens: Record<string, StitchScreen>;
};

// ── Prompt builder ────────────────────────────────────────────────────────

function buildPrompt(domain: DomainInput, systemName: string): string {
  const accent = domain.color ?? "#3b82f6";
  const workflowLabel = domain.workflow_name
    ? ` (workflow: ${domain.workflow_name.replace(/_/g, " ")})`
    : "";

  return [
    `Dark-mode enterprise ERP dashboard screen for: ${systemName} — ${domain.label} module${workflowLabel}.`,
    ``,
    `Color palette:`,
    `  - Page background: #0f0f12`,
    `  - Card / surface background: #141418`,
    `  - Card borders: #25252b`,
    `  - Domain accent: ${accent}`,
    `  - Text primary: #f4f4f5   Text secondary: #a1a1aa   Text muted: #71717a`,
    ``,
    `Typography: Inter, system-ui sans-serif.`,
    ``,
    `Layout (top to bottom, full-width):`,
    `1. Fixed top header bar (60px height):`,
    `   - Left: breadcrumb "ERP Console  >  ${domain.label}"`,
    `   - Right: two small action buttons ("+ New ${domain.label}" and "Export")`,
    ``,
    `2. KPI stat row — four equal-width cards side by side:`,
    `   - Each card: large bold metric number, label below, small trend arrow (↑/↓) + % in green/red`,
    `   - Metrics: Total ${domain.label}, Active This Month, Pending Review, Completion Rate`,
    ``,
    `3. Main area split (70% / 30%):`,
    `   Left (70%): Data table for ${domain.label} records.`,
    `     - Table header row with sort arrows`,
    `     - Columns: ID, Name, Program/Type, Submitted Date, Score/Amount, Status`,
    `     - Status column: colored pill badges`,
    `       • Submitted → blue (#3b82f6 bg at 15% opacity, text #60a5fa)`,
    `       • Under Review / Pending → amber (#f59e0b bg at 15%, text #fbbf24)`,
    `       • Approved / Completed → green (#16a34a bg at 15%, text #4ade80)`,
    `       • Rejected / Denied → red (#ef4444 bg at 15%, text #f87171)`,
    `     - Show exactly 8 sample data rows with realistic placeholder values`,
    `     - Pagination row at bottom: "Showing 1–8 of 342" + prev/next buttons`,
    ``,
    `   Right (30%): Activity card`,
    `     - Small bar chart showing 7-day trend (use SVG bars, no external charting library)`,
    `     - Recent activity feed: 5 items, each with a colored dot, action text, and relative time`,
    ``,
    `4. Left sidebar (240px, fixed height):`,
    `   - App logo / name at top`,
    `   - Navigation items for sub-sections of ${domain.label} (5-6 items)`,
    `   - Active item highlighted with ${accent} accent`,
    `   - Bottom: user avatar placeholder + "Settings"`,
    ``,
    `Design rules:`,
    `  - Border-radius: 6px on cards, 4px on badges and buttons`,
    `  - No stock photos, no icons from external CDNs — use simple Unicode symbols or inline SVG only`,
    `  - Box-shadow on cards: 0 1px 3px rgba(0,0,0,0.4)`,
    `  - Hover states on table rows: background #1e1e24`,
    `  - Completely self-contained HTML — all CSS must be inline or in a <style> block`,
    `  - No JavaScript needed`,
  ].join("\n");
}

// ── Fetch HTML content from Stitch download URL ────────────────────────────

async function fetchHtml(downloadUrl: string): Promise<string> {
  if (!downloadUrl || typeof downloadUrl !== "string") return "";
  try {
    const res = await fetch(downloadUrl);
    if (!res.ok) return "";
    return res.text();
  } catch {
    return "";
  }
}

// ── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Auth guard: require a logged-in session cookie
  const accessToken = request.cookies.get("access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ detail: "Not authenticated." }, { status: 401 });
  }

  const apiKey = process.env.STITCH_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { detail: "STITCH_API_KEY is not set on this server. Add it to .env.local." },
      { status: 503 }
    );
  }

  // Ensure the key is visible to the SDK via env
  process.env.STITCH_API_KEY = apiKey;

  let body: StitchGenerateBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body." }, { status: 400 });
  }

  const { system_name, domains, stitch_project_id } = body;

  if (!Array.isArray(domains) || domains.length === 0) {
    return NextResponse.json(
      { detail: "domains array is required and must not be empty." },
      { status: 400 }
    );
  }

  // Dynamically import Stitch SDK (keeps build from failing when key is absent)
  let stitchModule: { stitch: { project: (id: string) => StitchProjectRef; callTool: (name: string, args: Record<string, unknown>) => Promise<unknown> } };
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    stitchModule = (await import("@google/stitch-sdk")) as any;
  } catch {
    return NextResponse.json(
      { detail: "@google/stitch-sdk is not installed. Run: npm install @google/stitch-sdk" },
      { status: 503 }
    );
  }

  const { stitch } = stitchModule;

  try {
    // ── 1. Create or reuse a Stitch project ─────────────────────────────
    let projectId = stitch_project_id ?? "";

    if (!projectId) {
      const created = await stitch.callTool("create_project", {
        title: `${system_name} — Orquestra ERP`,
      }) as Record<string, unknown>;

      projectId = String(
        created.projectId ?? created.id ?? created.project_id ?? ""
      );
    }

    if (!projectId) {
      return NextResponse.json(
        { detail: "Stitch did not return a project ID. Check your API key and quota." },
        { status: 500 }
      );
    }

    const project = stitch.project(projectId);

    // ── 2. Generate a screen per domain (cap at 6 to protect quota) ─────
    const targets = domains.slice(0, 6);

    const settled = await Promise.allSettled(
      targets.map(async (domain) => {
        const prompt = buildPrompt(domain, system_name);
        const screen = await project.generate(prompt);

        const screenAny = screen as Record<string, unknown>;
        const screenId = String(
          screenAny.screenId ?? screenAny.id ?? screenAny.screen_id ?? ""
        );

        const [htmlUrl, imageUrl] = await Promise.all([
          screen.getHtml() as Promise<string>,
          (screen.getImage() as Promise<string>).catch(() => ""),
        ]);

        const html = await fetchHtml(htmlUrl);

        return {
          domainId: domain.id,
          html,
          image_url: imageUrl ?? "",
          screen_id: screenId,
        };
      })
    );

    // Collect fulfilled results; partial success is fine
    const screens: Record<string, StitchScreen> = {};
    const errors: string[] = [];

    for (const result of settled) {
      if (result.status === "fulfilled") {
        const { domainId, html, image_url, screen_id } = result.value;
        screens[domainId] = { html, image_url, screen_id };
      } else {
        errors.push(String(result.reason?.message ?? result.reason));
      }
    }

    if (Object.keys(screens).length === 0) {
      return NextResponse.json(
        { detail: `All Stitch screen generations failed. Errors: ${errors.join("; ")}` },
        { status: 500 }
      );
    }

    const payload: StitchGeneratePayload = { project_id: projectId, screens };
    return NextResponse.json(payload);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { detail: `Stitch error: ${message}` },
      { status: 500 }
    );
  }
}

// ── Stub type (SDK types may vary by version) ──────────────────────────────

interface StitchProjectRef {
  generate(prompt: string): Promise<{
    getHtml(): Promise<string>;
    getImage(): Promise<string>;
    [k: string]: unknown;
  }>;
}