"use client";

import { useEffect, useState } from "react";
import { Layers, ChevronRight, Tag } from "lucide-react";
import { toast } from "sonner";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { listTemplates, deployTemplate as deployTemplateFn, type TemplateItem } from "@/lib/console-api";

type Template = TemplateItem;

const CATEGORY_LABELS: Record<string, string> = {
  "higher-education": "Higher Education",
  hr: "HR",
  edtech: "EdTech",
  general: "General",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [deploying, setDeploying] = useState<string | null>(null);
  const context = useProjectContextStore((s) => s.context);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!context.institutionId) return;
      try {
        const data = await listTemplates(
          { institutionId: context.institutionId, projectId: context.projectId || "" },
          category !== "all" ? category : undefined
        );
        setTemplates(data.templates ?? []);
      } catch {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [category, context.institutionId, context.projectId]);

  async function deployTemplate(id: string, name: string) {
    if (!context.institutionId || !context.projectId) {
      toast.error("Select a project first");
      return;
    }
    setDeploying(id);
    try {
      await deployTemplateFn({ institutionId: context.institutionId, projectId: context.projectId }, id);
      toast.success(`Template "${name}" added as a workflow draft`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Deployment failed");
    } finally {
      setDeploying(null);
    }
  }

  const categories = ["all", "higher-education", "edtech", "hr", "general"];
  const cardStyle = { background: "#141418", borderColor: "#25252b" };

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#f4f4f5" }}>Templates</h1>
        <p className="text-sm mt-1" style={{ color: "#8a8a94" }}>
          Pre-built workflow blueprints — deploy as a draft, then customize and deploy
        </p>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="rounded-full px-3 py-1 text-xs border transition-colors"
            style={
              category === cat
                ? { background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" }
                : { borderColor: "#25252b", color: "#8a8a94", background: "transparent" }
            }
          >
            {cat === "all" ? "All" : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg border animate-pulse" style={cardStyle} />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#52525b" }}>
          <Layers size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No templates found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => (
            <div
              key={t.id}
              className="rounded-lg p-5 border flex flex-col"
              style={cardStyle}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wide"
                    style={{ borderColor: "#25252b", color: "#8a8a94" }}
                  >
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </span>
                </div>
              </div>

              <h3 className="text-base font-semibold mb-1.5" style={{ color: "#f4f4f5" }}>
                {t.name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
              </h3>
              <p className="text-sm flex-1 leading-relaxed" style={{ color: "#8a8a94" }}>
                {t.description}
              </p>

              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                <Tag size={11} style={{ color: "#52525b" }} />
                {t.compliance_tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded border font-mono"
                    style={{ borderColor: "#25252b", color: "#8a8a94" }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => deployTemplate(t.id, t.name)}
                disabled={deploying === t.id}
                className="mt-4 flex items-center justify-between w-full rounded px-4 py-2 text-sm border transition-colors disabled:opacity-60"
                style={{ borderColor: "#25252b", color: "#a1a1aa" }}
              >
                <span>{deploying === t.id ? "Deploying…" : "Deploy Template"}</span>
                <ChevronRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
