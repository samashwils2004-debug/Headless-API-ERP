"use client";

import { FormEvent, useState } from "react";

import { createProject, listProjects } from "@/lib/console-api";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useProjectStore } from "@/lib/stores/project-store";

export default function ProjectsPage() {
  const context = useProjectContextStore((state) => state.context);
  const setContext = useProjectContextStore((state) => state.setContext);
  const projects = useProjectStore((state) => state.projects);
  const setProjects = useProjectStore((state) => state.setProjects);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [environment, setEnvironment] = useState<"test" | "production">("test");

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!context.institutionId) {
      return;
    }

    await createProject(
      { institutionId: context.institutionId, projectId: context.projectId || "bootstrap" },
      { name, slug, environment }
    );

    const refreshed = await listProjects({
      institutionId: context.institutionId,
      projectId: context.projectId || "bootstrap",
    });
    setProjects(refreshed.projects);
    setName("");
    setSlug("");
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Projects</h2>

      <form
        onSubmit={onCreate}
        className="grid gap-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 md:grid-cols-4"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Project name"
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2"
        />
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          placeholder="Slug"
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2"
        />
        <select
          value={environment}
          onChange={(e) => setEnvironment(e.target.value as "test" | "production")}
          className="rounded-md border border-[var(--border-default)] bg-[var(--bg-primary)] px-3 py-2"
        >
          <option value="test">Test</option>
          <option value="production">Production</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-[var(--border-default)] bg-[var(--text-accent)] px-3 py-2 font-medium text-[var(--bg-primary)]"
        >
          Create Project
        </button>
      </form>

      <div className="overflow-hidden rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)]">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Environment</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-t border-[var(--border-default)]">
                <td className="px-4 py-3">{project.name}</td>
                <td className="px-4 py-3">{project.slug}</td>
                <td className="px-4 py-3">{project.environment}</td>
                <td className="px-4 py-3">
                  <button
                    className="underline text-[var(--text-secondary)]"
                    onClick={() => {
                      setContext({
                        institutionId: project.institution_id,
                        projectId: project.id,
                        projectName: project.name,
                        environment: project.environment,
                      });
                      document.cookie = `institution_id=${project.institution_id}; path=/; samesite=lax`;
                      document.cookie = `project_id=${project.id}; path=/; samesite=lax`;
                    }}
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
