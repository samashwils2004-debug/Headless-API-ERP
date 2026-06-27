"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  CheckCircle2,
  GitBranch,
  ChevronRight,
  Loader2,
  FlaskConical,
  Rocket,
  X,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { createProject, deleteProject, listProjects } from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useProjectStore } from "@/lib/stores/project-store";
import type { ProjectItem } from "@/types/contracts";

export default function ProjectsPage() {
  const router = useRouter();
  const context = useProjectContextStore((s) => s.context);
  const setContext = useProjectContextStore((s) => s.setContext);
  const projects = useProjectStore((s) => s.projects);
  const setProjects = useProjectStore((s) => s.setProjects);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [environment, setEnvironment] = useState<"test" | "production">("test");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Auto-derive slug from name
  useEffect(() => {
    setSlug(name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""));
  }, [name]);

  const handleDelete = async (project: ProjectItem) => {
    if (!confirm(`Delete project "${project.name}"? This cannot be undone.`)) return;
    setDeletingId(project.id);
    try {
      await deleteProject(
        { institutionId: project.institution_id, projectId: project.id },
        project.id,
      );
      const refreshed = await listProjects({
        institutionId: project.institution_id,
        projectId: project.id,
      });
      setProjects(refreshed.projects);
      if (context.projectId === project.id) {
        setContext({ institutionId: project.institution_id, projectId: "", projectName: "", environment: "test" });
      }
      toast.success(`Project "${project.name}" deleted`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  };

  const selectProject = (project: ProjectItem) => {
    setContext({
      institutionId: project.institution_id,
      projectId: project.id,
      projectName: project.name,
      environment: project.environment,
    });
    document.cookie = `institution_id=${project.institution_id}; path=/; samesite=lax`;
    document.cookie = `project_id=${project.id}; path=/; samesite=lax`;
    router.push("/console/workflows");
  };

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!context.institutionId) return;
    setCreating(true);
    setError(null);
    try {
      const { id: newId } = await createProject(
        { institutionId: context.institutionId, projectId: context.projectId || "bootstrap" },
        { name, slug, environment }
      );
      const refreshed = await listProjects({
        institutionId: context.institutionId,
        projectId: context.projectId || "bootstrap",
      });
      setProjects(refreshed.projects);
      // Auto-select the newly created project and navigate
      const newProject = refreshed.projects.find((p) => p.id === newId);
      if (newProject) selectProject(newProject);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create project");
      setCreating(false);
    }
  };

  const selectedId = context.projectId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: "#f4f4f5" }}>Projects</h2>
          <p className="text-sm mt-0.5" style={{ color: "#71717a" }}>
            Select a project to start building workflows
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setError(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
          style={{ background: "#3b82f6", color: "#fff" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Cancel" : "New Project"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={onCreate}
          className="rounded-lg p-5 space-y-4"
          style={{ background: "#141418", border: "1px solid #25252b" }}
        >
          <p className="text-sm font-medium" style={{ color: "#f4f4f5" }}>Create a new project</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Project Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Institution ERP"
                className="w-full rounded px-3 py-2 text-sm outline-none"
                style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#f4f4f5" }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Slug</label>
              <input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                required
                placeholder="institution-erp"
                className="w-full rounded px-3 py-2 text-sm outline-none font-mono"
                style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#a1a1aa" }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: "#a1a1aa" }}>Environment</label>
            <div className="flex gap-2">
              {(["test", "production"] as const).map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors"
                  style={
                    environment === env
                      ? { background: "#1e3a5f", border: "1px solid #1d4ed8", color: "#93c5fd" }
                      : { background: "#1b1b24", border: "1px solid #25252b", color: "#71717a" }
                  }
                >
                  {env === "test" ? <FlaskConical size={13} /> : <Rocket size={13} />}
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm px-3 py-2 rounded" style={{ background: "#1a0a0a", color: "#fca5a5", border: "1px solid #3a1a1a" }}>
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={creating || !name.trim() || !slug.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium disabled:opacity-50"
              style={{ background: "#3b82f6", color: "#fff" }}
            >
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {creating ? "Creating…" : "Create & Select Project"}
            </button>
          </div>
        </form>
      )}

      {/* Project list */}
      {projects.length === 0 ? (
        <div className="rounded-lg py-16 flex flex-col items-center gap-3"
          style={{ background: "#141418", border: "1px solid #25252b" }}>
          <FolderOpen size={32} style={{ color: "#3f3f46" }} />
          <p className="text-sm" style={{ color: "#71717a" }}>No projects yet — create one above to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => {
            const isSelected = project.id === selectedId;
            return (
              <div
                key={project.id}
                className="rounded-lg px-3 py-3 sm:px-5 sm:py-4 flex items-start sm:items-center justify-between gap-3 transition-colors"
                style={
                  isSelected
                    ? { background: "#0d1f3c", border: "1px solid #1d4ed8" }
                    : { background: "#141418", border: "1px solid #25252b" }
                }
              >
                <div className="flex items-center gap-4 min-w-0">
                  {/* Icon */}
                  <div className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: isSelected ? "#1e3a5f" : "#1b1b24" }}>
                    <FolderOpen size={16} style={{ color: isSelected ? "#60a5fa" : "#52525b" }} />
                  </div>

                  {/* Name + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" style={{ color: isSelected ? "#f4f4f5" : "#d4d4d8" }}>
                        {project.name}
                      </span>
                      {isSelected && (
                        <span className="flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "#0a1a0a", color: "#86efac", border: "1px solid #1a3a1a" }}>
                          <CheckCircle2 size={10} /> Active
                        </span>
                      )}
                      <span className="text-[11px] px-1.5 py-0.5 rounded"
                        style={
                          project.environment === "production"
                            ? { background: "#1a0a2a", color: "#c084fc", border: "1px solid #2f1f40" }
                            : { background: "#141418", color: "#71717a", border: "1px solid #25252b" }
                        }>
                        {project.environment === "production" ? <span className="flex items-center gap-1"><Rocket size={9} /> Production</span> : <span className="flex items-center gap-1"><FlaskConical size={9} /> Test</span>}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 font-mono" style={{ color: "#52525b" }}>{project.slug}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="shrink-0 flex items-center gap-2">
                  {isSelected ? (
                    <button
                      onClick={() => router.push("/console/workflows")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium"
                      style={{ background: "#1e3a5f", border: "1px solid #1d4ed8", color: "#93c5fd" }}
                    >
                      <GitBranch size={12} /> Go to Workflows
                    </button>
                  ) : (
                    <button
                      onClick={() => selectProject(project)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
                      style={{ background: "#1b1b24", border: "1px solid #25252b", color: "#a1a1aa" }}
                    >
                      Select <ChevronRight size={12} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(project)}
                    disabled={deletingId === project.id}
                    className="flex items-center gap-1 px-2 py-1.5 rounded text-xs transition-colors disabled:opacity-40"
                    style={{ color: "#71717a", border: "1px solid #25252b" }}
                    title="Delete project"
                  >
                    {deletingId === project.id
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Trash2 size={11} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer hint */}
      {projects.length > 0 && !selectedId && (
        <p className="text-xs text-center" style={{ color: "#52525b" }}>
          Select a project above to activate it and start building workflows.
        </p>
      )}
    </div>
  );
}
