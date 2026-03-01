"use client";

import { useEffect, useRef } from "react";

import { getCurrentUser, listProjects, listWorkflows, type TenantContext } from "@/lib/console-api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useBlueprintStore } from "@/lib/stores/blueprint-store";
import { useEventStore } from "@/lib/stores/event-store";
import { useProjectContextStore } from "@/lib/stores/project-context-store";
import { useProjectStore } from "@/lib/stores/project-store";
import { useWorkflowStore } from "@/lib/stores/workflow-store";

export function ConsoleProvider({ children }: { children: React.ReactNode }) {
  const initialized = useRef(false);
  const context = useProjectContextStore((state) => state.context);
  const setContext = useProjectContextStore((state) => state.setContext);
  const setProjects = useProjectStore((state) => state.setProjects);
  const setWorkflows = useWorkflowStore((state) => state.setWorkflows);
  const setUser = useAuthStore((state) => state.setUser);
  const clearEvents = useEventStore((state) => state.clear);
  const clearBlueprint = useBlueprintStore((state) => state.clear);

  useEffect(() => {
    if (initialized.current) {
      return;
    }
    initialized.current = true;

    const bootstrap = async () => {
      try {
        const user = await getCurrentUser();
        setUser(user);

        const bootstrapTenant: TenantContext = {
          institutionId: context.institutionId || user.institution_id,
          projectId: context.projectId || "bootstrap",
        };

        const projectsPayload = await listProjects(bootstrapTenant);
        setProjects(projectsPayload.projects);

        const activeProject =
          projectsPayload.projects.find((project) => project.id === context.projectId) ||
          projectsPayload.projects[0] ||
          null;

        if (activeProject) {
          const nextContext = {
            institutionId: activeProject.institution_id,
            projectId: activeProject.id,
            projectName: activeProject.name,
            environment: activeProject.environment,
          };
          setContext(nextContext);
          if (typeof document !== "undefined") {
            document.cookie = `institution_id=${activeProject.institution_id}; path=/; samesite=lax`;
            document.cookie = `project_id=${activeProject.id}; path=/; samesite=lax`;
          }

          const workflowsPayload = await listWorkflows({
            institutionId: activeProject.institution_id,
            projectId: activeProject.id,
          });
          setWorkflows(workflowsPayload.workflows);
        }
      } catch {
        setUser(null);
      }
    };

    bootstrap();
  }, [context.institutionId, context.projectId, setContext, setProjects, setUser, setWorkflows]);

  useEffect(() => {
    setWorkflows([]);
    clearEvents();
    clearBlueprint();
  }, [context.projectId, clearEvents, clearBlueprint, setWorkflows]);

  return <>{children}</>;
}
