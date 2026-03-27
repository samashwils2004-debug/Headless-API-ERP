# Repository File Connectivity

Filter:
- Frontend runtime files under `apps/web/src/**/*.ts(x)` plus `apps/web/middleware.ts`
- Backend runtime files under `apps/api/app/**/*.py`
- Excludes docs, tests, migrations, SQL, templates, and `node_modules`

## Cross-Layer Flows

### `apps/web/src/app/(auth)/login/page.tsx`
- `handleSubmit` [POST] -> `/api/auth/login`
  Next route: `apps/web/src/app/api/auth/login/route.ts` -> `/api/auth/login`
  Backend handler: `apps/api/app/routes/auth.py::login` -> `/api/auth/login`
  Handler calls: `apps/api/app/security.py::verify_password`, `apps/api/app/security.py::create_access_token`, `apps/api/app/security.py::create_refresh_token`, `apps/api/app/schemas/__init__.py::TokenResponse`

### `apps/web/src/app/console/architect/page.tsx`
- `generate` [POST] -> `/api/ai/compile`
  Next route: `apps/web/src/app/api/ai/compile/route.ts` -> `/api/ai/compile`
  Backend handler: `apps/api/app/routes/ai.py::compile_blueprint` -> `/api/ai/blueprints/compile`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/models/__init__.py::BlueprintProposal`

### `apps/web/src/lib/console-api.ts`
- `getCurrentUser` [GET] -> `/api/auth/me`
  Next route: `apps/web/src/app/api/auth/me/route.ts` -> `/api/auth/me`
  Backend handler: `apps/api/app/routes/auth.py::me` -> `/api/auth/me`
- `listProjects` [GET] -> `/api/projects`
  Next route: `apps/web/src/app/api/projects/route.ts` -> `/api/projects`
  Backend handler: `apps/api/app/routes/projects.py::list_projects` -> `/api/projects`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`
- `createProject` [POST] -> `/api/projects`
  Next route: `apps/web/src/app/api/projects/route.ts` -> `/api/projects`
  Backend handler: `apps/api/app/routes/projects.py::create_project` -> `/api/projects`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/models/__init__.py::Project`
- `listWorkflows` [GET] -> `/api/workflows`
  Next route: `apps/web/src/app/api/workflows/route.ts` -> `/api/workflows`
  Backend handler: `apps/api/app/routes/workflows.py::list_workflows` -> `/api/workflows`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`
- `createWorkflow` [POST] -> `/api/workflows`
  Next route: `apps/web/src/app/api/workflows/route.ts` -> `/api/workflows`
  Backend handler: `apps/api/app/routes/workflows.py::create_workflow` -> `/api/workflows`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/models/__init__.py::Workflow`
- `deployWorkflow` [POST] -> `/api/workflows/{workflowId}/deploy`
  Next route: `apps/web/src/app/api/workflows/[workflowId]/deploy/route.ts` -> `/api/workflows/{workflowId}/deploy`
  Backend handler: `apps/api/app/routes/workflows.py::deploy_workflow` -> `/api/workflows/{workflow_id}/deploy`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/core/event_engine.py::EventEngine`, `apps/api/app/core/event_engine.py::EventEngine.emit`
- `listApplications` [GET] -> `/api/applications`
  Next route: `apps/web/src/app/api/applications/route.ts` -> `/api/applications`
  Backend handler: `apps/api/app/routes/applications.py::list_applications` -> `/api/applications`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`
- `listEvents` [GET] -> `/api/events`
  Next route: `apps/web/src/app/api/events/route.ts` -> `/api/events`
  Backend handler: `apps/api/app/routes/events.py::list_events` -> `/api/events`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`
- `compileBlueprint` [POST] -> `/api/ai/compile`
  Next route: `apps/web/src/app/api/ai/compile/route.ts` -> `/api/ai/compile`
  Backend handler: `apps/api/app/routes/ai.py::compile_blueprint` -> `/api/ai/blueprints/compile`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/models/__init__.py::BlueprintProposal`
- `deployBlueprint` [POST] -> `/api/ai/deploy/{proposalId}`
  Next route: `apps/web/src/app/api/ai/deploy/[proposalId]/route.ts` -> `/api/ai/deploy/{proposalId}`
  Backend handler: `apps/api/app/routes/ai.py::deploy_blueprint` -> `/api/ai/blueprints/{proposal_id}/deploy`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/models/__init__.py::Workflow`, `apps/api/app/time_utils.py::utcnow_naive`, `apps/api/app/core/event_engine.py::EventEngine`, `apps/api/app/core/event_engine.py::EventEngine.emit`
- `getTemplate` [GET] -> `/api/templates/{id}`
  Next route: `apps/web/src/app/api/templates/[id]/route.ts` -> `/api/templates/{id}`
  Backend handler: `apps/api/app/routes/templates.py::get_template` -> `/api/templates/{template_id}`
- `deployTemplate` [POST] -> `/api/templates/{templateId}/deploy`
  Next route: `apps/web/src/app/api/templates/[id]/deploy/route.ts` -> `/api/templates/{id}/deploy`
  Backend handler: `apps/api/app/routes/templates.py::deploy_template` -> `/api/templates/{template_id}/deploy`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`, `apps/api/app/models/__init__.py::Workflow`
- `customizeTemplate` [POST] -> `/api/templates/{id}/customize`
  Next route: `apps/web/src/app/api/templates/[id]/customize/route.ts` -> `/api/templates/{id}/customize`
  Backend handler: `apps/api/app/routes/templates.py::customize_template` -> `/api/templates/{template_id}/customize`
  Handler calls: `apps/api/app/models/__init__.py::TemplateCustomization`, `apps/api/app/schemas/__init__.py::TemplateCustomizeResponse`
- `getOrCreateArchitecture` [GET] -> `/api/architect`
  Next route: `apps/web/src/app/api/architect/route.ts` -> `/api/architect`
  Backend handler: `apps/api/app/routes/architect.py::get_or_list_architectures` -> `/api/architect`
- `getOrCreateArchitecture` [POST] -> `/api/architect`
  Next route: `apps/web/src/app/api/architect/route.ts` -> `/api/architect`
  Backend handler: `apps/api/app/routes/architect.py::create_architecture` -> `/api/architect`
  Handler calls: `apps/api/app/models/__init__.py::InstitutionArchitecture`
- `applyArchitectPrompt` [POST] -> `/api/architect/{archId}/prompt`
  Next route: `apps/web/src/app/api/architect/[id]/prompt/route.ts` -> `/api/architect/{id}/prompt`
  Backend handler: `apps/api/app/routes/architect.py::apply_prompt` -> `/api/architect/{arch_id}/prompt`
  Handler calls: `apps/api/app/ai/provider_router.py::get_provider_router`, `apps/api/app/time_utils.py::utcnow_naive`, `apps/api/app/models/__init__.py::ArchitectureVersion`
- `linkWorkflowToDomain` [POST] -> `/api/architect/{archId}/link-workflow`
  Next route: `apps/web/src/app/api/architect/[id]/link-workflow/route.ts` -> `/api/architect/{id}/link-workflow`
  Backend handler: `apps/api/app/routes/architect.py::link_workflow` -> `/api/architect/{arch_id}/link-workflow`
  Handler calls: `apps/api/app/time_utils.py::utcnow_naive`
- `getAvailableWorkflows` [GET] -> `/api/architect/{archId}/available-workflows`
  Next route: `apps/web/src/app/api/architect/[id]/available-workflows/route.ts` -> `/api/architect/{id}/available-workflows`
  Backend handler: `apps/api/app/routes/architect.py::available_workflows` -> `/api/architect/{arch_id}/available-workflows`
- `getArchitectureVersions` [GET] -> `/api/architect/{archId}/versions`
  Next route: `apps/web/src/app/api/architect/[id]/versions/route.ts` -> `/api/architect/{id}/versions`
  Backend handler: `apps/api/app/routes/architect.py::list_versions` -> `/api/architect/{arch_id}/versions`

### `apps/web/src/lib/hooks/useEventStream.ts`
- `backfill` [GET] -> `/api/events`
  Next route: `apps/web/src/app/api/events/route.ts` -> `/api/events`
  Backend handler: `apps/api/app/routes/events.py::list_events` -> `/api/events`
  Handler calls: `apps/api/app/core/rbac_engine.py::check_permission`
- `connect` [WEBSOCKET] -> `/api/events/ws`
  Backend handler: `apps/api/app/main.py::events_ws` -> `/api/events/ws`

## Frontend File Map

### `apps/web/middleware.ts`

### `apps/web/src/app/(auth)/layout.tsx`

### `apps/web/src/app/(auth)/login/page.tsx`
- API calls: `handleSubmit` [POST] -> /api/auth/login

### `apps/web/src/app/(landing)/architecture/page.tsx`

### `apps/web/src/app/(landing)/demo/page.tsx`

### `apps/web/src/app/(landing)/layout.tsx`
- Imports: `apps/web/src/components/landing/AnnouncementBar.tsx`, `apps/web/src/components/landing/LandingNav.tsx`
- Active repo usages: `AnnouncementBar` -> `apps/web/src/components/landing/AnnouncementBar.tsx` (jsx), `LandingNav` -> `apps/web/src/components/landing/LandingNav.tsx` (jsx)

### `apps/web/src/app/(landing)/page.tsx`
- Imports: `apps/web/src/components/landing/LandingFooter.tsx`
- Active repo usages: `LandingFooter` -> `apps/web/src/components/landing/LandingFooter.tsx` (jsx)

### `apps/web/src/app/(landing)/pricing/page.tsx`
- Imports: `apps/web/src/components/landing/LandingFooter.tsx`
- Active repo usages: `LandingFooter` -> `apps/web/src/components/landing/LandingFooter.tsx` (jsx)

### `apps/web/src/app/api/_utils.ts`
- Imported by: `apps/web/src/app/api/admin/dashboard/route.ts`, `apps/web/src/app/api/ai/compile/route.ts`, `apps/web/src/app/api/ai/deploy/[proposalId]/route.ts`, `apps/web/src/app/api/applications/[applicationId]/transition/route.ts`, `apps/web/src/app/api/applications/route.ts`, `apps/web/src/app/api/architect/[id]/available-workflows/route.ts`, `apps/web/src/app/api/architect/[id]/link-workflow/route.ts`, `apps/web/src/app/api/architect/[id]/prompt/route.ts`, `apps/web/src/app/api/architect/[id]/route.ts`, `apps/web/src/app/api/architect/[id]/versions/route.ts`, `apps/web/src/app/api/architect/[id]/visualization/route.ts`, `apps/web/src/app/api/architect/route.ts`, `apps/web/src/app/api/auth/login/route.ts`, `apps/web/src/app/api/auth/me/route.ts`, `apps/web/src/app/api/events/route.ts`, `apps/web/src/app/api/projects/route.ts`, `apps/web/src/app/api/templates/[id]/customize/route.ts`, `apps/web/src/app/api/templates/[id]/deploy/route.ts`, `apps/web/src/app/api/templates/[id]/route.ts`, `apps/web/src/app/api/templates/route.ts`, `apps/web/src/app/api/workflows/[workflowId]/deploy/route.ts`, `apps/web/src/app/api/workflows/route.ts`

### `apps/web/src/app/api/admin/dashboard/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/admin/dashboard` [GET]
- Proxies to backend: `GET /api/admin/dashboard`

### `apps/web/src/app/api/ai/compile/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/ai/compile` [POST]
- Proxies to backend: `POST /api/ai/blueprints/compile`

### `apps/web/src/app/api/ai/deploy/[proposalId]/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/ai/deploy/{proposalId}` [POST]
- Proxies to backend: `POST /api/ai/blueprints/{proposalId}/deploy`

### `apps/web/src/app/api/applications/[applicationId]/transition/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/applications/{applicationId}/transition` [POST]
- Proxies to backend: `POST /api/applications/{applicationId}/transition`

### `apps/web/src/app/api/applications/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/applications` [GET, POST]
- Proxies to backend: `GET /api/applications`, `POST /api/applications`

### `apps/web/src/app/api/architect/[id]/available-workflows/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect/{id}/available-workflows` [GET]
- Proxies to backend: `GET /api/architect/{id}/available-workflows`

### `apps/web/src/app/api/architect/[id]/link-workflow/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect/{id}/link-workflow` [POST]
- Proxies to backend: `POST /api/architect/{id}/link-workflow`

### `apps/web/src/app/api/architect/[id]/prompt/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect/{id}/prompt` [POST]
- Proxies to backend: `POST /api/architect/{id}/prompt`

### `apps/web/src/app/api/architect/[id]/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect/{id}` [GET]
- Proxies to backend: `GET /api/architect/{id}`

### `apps/web/src/app/api/architect/[id]/versions/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect/{id}/versions` [GET]
- Proxies to backend: `GET /api/architect/{id}/versions`

### `apps/web/src/app/api/architect/[id]/visualization/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect/{id}/visualization` [GET]
- Proxies to backend: `GET /api/architect/{id}/visualization`

### `apps/web/src/app/api/architect/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/architect` [GET, POST]
- Proxies to backend: `GET /api/architect`, `POST /api/architect`

### `apps/web/src/app/api/auth/login/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `backendBaseUrl` -> `apps/web/src/app/api/_utils.ts` (call)
- API calls: `POST` [POST] -> /api/auth/login
- Next route: `/api/auth/login` [POST]
- Proxies to backend: `POST /api/auth/login`

### `apps/web/src/app/api/auth/logout/route.ts`
- Next route: `/api/auth/logout` [POST]
- Proxies to backend: none

### `apps/web/src/app/api/auth/me/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/auth/me` [GET]
- Proxies to backend: `GET /api/auth/me`

### `apps/web/src/app/api/auth/supabase-token/route.ts`
- Next route: `/api/auth/supabase-token` [POST]
- Proxies to backend: none

### `apps/web/src/app/api/events/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/events` [GET]
- Proxies to backend: `GET /api/events`

### `apps/web/src/app/api/projects/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/projects` [GET, POST]
- Proxies to backend: `GET /api/projects`, `POST /api/projects`

### `apps/web/src/app/api/templates/[id]/customize/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/templates/{id}/customize` [POST]
- Proxies to backend: `POST /api/templates/{id}/customize`

### `apps/web/src/app/api/templates/[id]/deploy/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/templates/{id}/deploy` [POST]
- Proxies to backend: `POST /api/templates/{id}/deploy`

### `apps/web/src/app/api/templates/[id]/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/templates/{id}` [GET]
- Proxies to backend: `GET /api/templates/{id}`

### `apps/web/src/app/api/templates/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/templates` [GET]
- Proxies to backend: none

### `apps/web/src/app/api/workflows/[workflowId]/deploy/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/workflows/{workflowId}/deploy` [POST]
- Proxies to backend: `POST /api/workflows/{workflowId}/deploy`

### `apps/web/src/app/api/workflows/route.ts`
- Imports: `apps/web/src/app/api/_utils.ts`
- Active repo usages: `proxyJson` -> `apps/web/src/app/api/_utils.ts` (call)
- Next route: `/api/workflows` [GET, POST]
- Proxies to backend: `GET /api/workflows`, `POST /api/workflows`

### `apps/web/src/app/console/ai/page.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/enforcement/deploymentGuard.ts`, `apps/web/src/lib/enforcement/validationGuard.ts`, `apps/web/src/lib/enforcement/validationGuard.ts`, `apps/web/src/lib/stores/blueprint-store.ts`, `apps/web/src/lib/stores/project-context-store.ts`, `apps/web/src/lib/stores/workflow-store.ts`, `apps/web/src/types/contracts.ts`, `apps/web/src/types/contracts.ts`, `apps/web/src/types/contracts.ts`
- Active repo usages: `compileBlueprint` -> `apps/web/src/lib/console-api.ts` (call), `deployBlueprint` -> `apps/web/src/lib/console-api.ts` (call), `listWorkflows` -> `apps/web/src/lib/console-api.ts` (call), `guardedDeploy` -> `apps/web/src/lib/enforcement/deploymentGuard.ts` (call), `assertDeployAllowed` -> `apps/web/src/lib/enforcement/validationGuard.ts` (call), `hasBlockingValidationIssues` -> `apps/web/src/lib/enforcement/validationGuard.ts` (call), `useBlueprintStore` -> `apps/web/src/lib/stores/blueprint-store.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call), `useWorkflowStore` -> `apps/web/src/lib/stores/workflow-store.ts` (call)

### `apps/web/src/app/console/api-keys/page.tsx`
- Imports: `apps/web/src/lib/stores/project-context-store.ts`
- Active repo usages: `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call)

### `apps/web/src/app/console/architect/page.tsx`
- Imports: `apps/web/src/lib/stores/project-context-store.ts`
- Active repo usages: `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call)
- API calls: `generate` [POST] -> /api/ai/compile

### `apps/web/src/app/console/events/page.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/hooks/useEventStream.ts`, `apps/web/src/lib/stores/event-store.ts`, `apps/web/src/lib/stores/project-context-store.ts`
- Active repo usages: `listEvents` -> `apps/web/src/lib/console-api.ts` (call), `useEventStream` -> `apps/web/src/lib/hooks/useEventStream.ts` (call), `useEventStore` -> `apps/web/src/lib/stores/event-store.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call)

### `apps/web/src/app/console/layout.tsx`
- Imports: `apps/web/src/components/console/ConsoleProvider.tsx`, `apps/web/src/components/console/ConsoleShell.tsx`
- Active repo usages: `ConsoleProvider` -> `apps/web/src/components/console/ConsoleProvider.tsx` (jsx), `ConsoleShell` -> `apps/web/src/components/console/ConsoleShell.tsx` (jsx)

### `apps/web/src/app/console/page.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/hooks/useEventStream.ts`, `apps/web/src/lib/stores/event-store.ts`, `apps/web/src/lib/stores/project-context-store.ts`, `apps/web/src/lib/stores/workflow-store.ts`
- Active repo usages: `listEvents` -> `apps/web/src/lib/console-api.ts` (call), `listWorkflows` -> `apps/web/src/lib/console-api.ts` (call), `useEventStream` -> `apps/web/src/lib/hooks/useEventStream.ts` (call), `useEventStore` -> `apps/web/src/lib/stores/event-store.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call), `useWorkflowStore` -> `apps/web/src/lib/stores/workflow-store.ts` (call)

### `apps/web/src/app/console/projects/page.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/stores/project-context-store.ts`, `apps/web/src/lib/stores/project-store.ts`
- Active repo usages: `createProject` -> `apps/web/src/lib/console-api.ts` (call), `listProjects` -> `apps/web/src/lib/console-api.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call), `useProjectStore` -> `apps/web/src/lib/stores/project-store.ts` (call)

### `apps/web/src/app/console/settings/page.tsx`
- Imports: `apps/web/src/lib/stores/project-context-store.ts`
- Active repo usages: `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call)

### `apps/web/src/app/console/templates/page.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/stores/project-context-store.ts`
- Active repo usages: `listTemplates` -> `apps/web/src/lib/console-api.ts` (call), `getTemplate` -> `apps/web/src/lib/console-api.ts` (call), `customizeTemplate` -> `apps/web/src/lib/console-api.ts` (call), `deployTemplate` -> `apps/web/src/lib/console-api.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call)

### `apps/web/src/app/console/workflows/[id]/edit/page.tsx`
- Imports: `apps/web/src/lib/enforcement/immutabilityGuard.ts`, `apps/web/src/lib/enforcement/validationGuard.ts`, `apps/web/src/lib/stores/blueprint-store.ts`, `apps/web/src/lib/stores/workflow-store.ts`
- Active repo usages: `assertWorkflowEditable` -> `apps/web/src/lib/enforcement/immutabilityGuard.ts` (call), `hasBlockingValidationIssues` -> `apps/web/src/lib/enforcement/validationGuard.ts` (call), `useBlueprintStore` -> `apps/web/src/lib/stores/blueprint-store.ts` (call), `useWorkflowStore` -> `apps/web/src/lib/stores/workflow-store.ts` (call)

### `apps/web/src/app/console/workflows/[id]/page.tsx`
- Imports: `apps/web/src/lib/stores/workflow-store.ts`
- Active repo usages: `useWorkflowStore` -> `apps/web/src/lib/stores/workflow-store.ts` (call)

### `apps/web/src/app/console/workflows/page.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/stores/project-context-store.ts`, `apps/web/src/lib/stores/workflow-store.ts`
- Active repo usages: `compileBlueprint` -> `apps/web/src/lib/console-api.ts` (call), `createWorkflow` -> `apps/web/src/lib/console-api.ts` (call), `deployBlueprint` -> `apps/web/src/lib/console-api.ts` (call), `deployWorkflow` -> `apps/web/src/lib/console-api.ts` (call), `listWorkflows` -> `apps/web/src/lib/console-api.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call), `useWorkflowStore` -> `apps/web/src/lib/stores/workflow-store.ts` (call)

### `apps/web/src/app/docs/api-reference/page.tsx`

### `apps/web/src/app/docs/architecture/page.tsx`
- Imports: `apps/web/src/components/docs/DocArticle.tsx`
- Active repo usages: `DocArticle` -> `apps/web/src/components/docs/DocArticle.tsx` (jsx)

### `apps/web/src/app/docs/introduction/page.tsx`

### `apps/web/src/app/docs/layout.tsx`
- Imports: `apps/web/src/components/landing/AnnouncementBar.tsx`, `apps/web/src/components/landing/LandingNav.tsx`, `apps/web/src/components/landing/LandingFooter.tsx`
- Active repo usages: `AnnouncementBar` -> `apps/web/src/components/landing/AnnouncementBar.tsx` (jsx), `LandingNav` -> `apps/web/src/components/landing/LandingNav.tsx` (jsx), `LandingFooter` -> `apps/web/src/components/landing/LandingFooter.tsx` (jsx)

### `apps/web/src/app/docs/page.tsx`
- Imports: `apps/web/src/components/docs/DocArticle.tsx`
- Active repo usages: `DocArticle` -> `apps/web/src/components/docs/DocArticle.tsx` (jsx)

### `apps/web/src/app/docs/security/page.tsx`

### `apps/web/src/app/docs/setup/page.tsx`
- Imports: `apps/web/src/components/docs/DocArticle.tsx`
- Active repo usages: `DocArticle` -> `apps/web/src/components/docs/DocArticle.tsx` (jsx)

### `apps/web/src/app/docs/tech-stack/page.tsx`
- Imports: `apps/web/src/components/docs/DocArticle.tsx`
- Active repo usages: `DocArticle` -> `apps/web/src/components/docs/DocArticle.tsx` (jsx)

### `apps/web/src/app/docs/workflow-engine/page.tsx`
- Imports: `apps/web/src/components/docs/DocArticle.tsx`
- Active repo usages: `DocArticle` -> `apps/web/src/components/docs/DocArticle.tsx` (jsx)

### `apps/web/src/app/layout.tsx`
- Imports: `apps/web/src/components/ui/sonner.tsx`
- Active repo usages: `Toaster` -> `apps/web/src/components/ui/sonner.tsx` (jsx)

### `apps/web/src/app/legacy-pages/ApiReferencePage.tsx`
- Imports: `apps/web/src/components/docs/Breadcrumb.tsx`, `apps/web/src/components/docs/CodeBlock.tsx`, `apps/web/src/components/docs/AlertBox.tsx`
- Active repo usages: `Breadcrumb` -> `apps/web/src/components/docs/Breadcrumb.tsx` (jsx), `CodeBlock` -> `apps/web/src/components/docs/CodeBlock.tsx` (jsx), `AlertBox` -> `apps/web/src/components/docs/AlertBox.tsx` (jsx)

### `apps/web/src/app/legacy-pages/DemoPage.tsx`
- Imports: `apps/web/src/types/index.ts`, `apps/web/src/components/docs/CodeBlock.tsx`, `apps/web/src/components/interactive/ConsoleOutput.tsx`, `apps/web/src/types/index.ts`
- Active repo usages: `CodeBlock` -> `apps/web/src/components/docs/CodeBlock.tsx` (jsx), `ConsoleOutput` -> `apps/web/src/components/interactive/ConsoleOutput.tsx` (jsx), `LogEntry` -> `apps/web/src/types/index.ts` (jsx)

### `apps/web/src/app/legacy-pages/IntroductionPage.tsx`
- Imports: `apps/web/src/components/docs/Breadcrumb.tsx`, `apps/web/src/components/docs/AlertBox.tsx`, `apps/web/src/components/docs/OnThisPage.tsx`, `apps/web/src/types/index.ts`
- Active repo usages: `Breadcrumb` -> `apps/web/src/components/docs/Breadcrumb.tsx` (jsx), `AlertBox` -> `apps/web/src/components/docs/AlertBox.tsx` (jsx), `OnThisPage` -> `apps/web/src/components/docs/OnThisPage.tsx` (jsx)

### `apps/web/src/app/legacy-pages/LandingPage.tsx`
- Imports: `apps/web/src/components/landing/HeroSection.tsx`, `apps/web/src/components/landing/StatCounters.tsx`, `apps/web/src/components/interactive/WorkflowVisualizer.tsx`, `apps/web/src/components/landing/FeatureGrid.tsx`, `apps/web/src/components/landing/LandingFooter.tsx`
- Active repo usages: `HeroSection` -> `apps/web/src/components/landing/HeroSection.tsx` (jsx), `StatCounters` -> `apps/web/src/components/landing/StatCounters.tsx` (jsx), `WorkflowVisualizer` -> `apps/web/src/components/interactive/WorkflowVisualizer.tsx` (jsx), `FeatureGrid` -> `apps/web/src/components/landing/FeatureGrid.tsx` (jsx), `LandingFooter` -> `apps/web/src/components/landing/LandingFooter.tsx` (jsx)

### `apps/web/src/app/legacy-pages/NotFoundPage.tsx`
- Imports: `apps/web/src/components/ui/button.tsx`
- Active repo usages: `Button` -> `apps/web/src/components/ui/button.tsx` (jsx)

### `apps/web/src/app/legacy-pages/SecurityPage.tsx`
- Imports: `apps/web/src/components/docs/Breadcrumb.tsx`, `apps/web/src/components/docs/CodeBlock.tsx`, `apps/web/src/components/docs/AlertBox.tsx`
- Active repo usages: `Breadcrumb` -> `apps/web/src/components/docs/Breadcrumb.tsx` (jsx), `CodeBlock` -> `apps/web/src/components/docs/CodeBlock.tsx` (jsx), `AlertBox` -> `apps/web/src/components/docs/AlertBox.tsx` (jsx)

### `apps/web/src/app/legacy-pages/SetupPage.tsx`
- Imports: `apps/web/src/components/docs/Breadcrumb.tsx`, `apps/web/src/components/docs/AlertBox.tsx`, `apps/web/src/components/docs/CodeBlock.tsx`, `apps/web/src/components/docs/OnThisPage.tsx`, `apps/web/src/types/index.ts`
- Active repo usages: `Breadcrumb` -> `apps/web/src/components/docs/Breadcrumb.tsx` (jsx), `AlertBox` -> `apps/web/src/components/docs/AlertBox.tsx` (jsx), `CodeBlock` -> `apps/web/src/components/docs/CodeBlock.tsx` (jsx), `OnThisPage` -> `apps/web/src/components/docs/OnThisPage.tsx` (jsx)

### `apps/web/src/app/legacy-pages/TechStackPage.tsx`
- Imports: `apps/web/src/components/docs/Breadcrumb.tsx`, `apps/web/src/components/docs/AlertBox.tsx`
- Active repo usages: `Breadcrumb` -> `apps/web/src/components/docs/Breadcrumb.tsx` (jsx), `AlertBox` -> `apps/web/src/components/docs/AlertBox.tsx` (jsx)

### `apps/web/src/app/legacy-pages/WorkflowEnginePage.tsx`
- Imports: `apps/web/src/components/docs/Breadcrumb.tsx`, `apps/web/src/components/docs/CodeBlock.tsx`, `apps/web/src/components/docs/AlertBox.tsx`, `apps/web/src/components/docs/OnThisPage.tsx`, `apps/web/src/types/index.ts`
- Active repo usages: `Breadcrumb` -> `apps/web/src/components/docs/Breadcrumb.tsx` (jsx), `CodeBlock` -> `apps/web/src/components/docs/CodeBlock.tsx` (jsx), `AlertBox` -> `apps/web/src/components/docs/AlertBox.tsx` (jsx), `OnThisPage` -> `apps/web/src/components/docs/OnThisPage.tsx` (jsx)

### `apps/web/src/app/not-found.tsx`

### `apps/web/src/components/console/ConsoleProvider.tsx`
- Imports: `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/stores/auth-store.ts`, `apps/web/src/lib/stores/blueprint-store.ts`, `apps/web/src/lib/stores/event-store.ts`, `apps/web/src/lib/stores/project-context-store.ts`, `apps/web/src/lib/stores/project-store.ts`, `apps/web/src/lib/stores/workflow-store.ts`
- Active repo usages: `getCurrentUser` -> `apps/web/src/lib/console-api.ts` (call), `listProjects` -> `apps/web/src/lib/console-api.ts` (call), `listWorkflows` -> `apps/web/src/lib/console-api.ts` (call), `useAuthStore` -> `apps/web/src/lib/stores/auth-store.ts` (call), `useBlueprintStore` -> `apps/web/src/lib/stores/blueprint-store.ts` (call), `useEventStore` -> `apps/web/src/lib/stores/event-store.ts` (call), `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call), `useProjectStore` -> `apps/web/src/lib/stores/project-store.ts` (call), `useWorkflowStore` -> `apps/web/src/lib/stores/workflow-store.ts` (call)
- Imported by: `apps/web/src/app/console/layout.tsx`

### `apps/web/src/components/console/ConsoleShell.tsx`
- Imports: `apps/web/src/lib/stores/project-context-store.ts`, `apps/web/src/lib/stores/project-store.ts`
- Active repo usages: `useProjectContextStore` -> `apps/web/src/lib/stores/project-context-store.ts` (call), `useProjectStore` -> `apps/web/src/lib/stores/project-store.ts` (call)
- Imported by: `apps/web/src/app/console/layout.tsx`

### `apps/web/src/components/docs/AlertBox.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/app/legacy-pages/ApiReferencePage.tsx`, `apps/web/src/app/legacy-pages/IntroductionPage.tsx`, `apps/web/src/app/legacy-pages/SecurityPage.tsx`, `apps/web/src/app/legacy-pages/SetupPage.tsx`, `apps/web/src/app/legacy-pages/TechStackPage.tsx`, `apps/web/src/app/legacy-pages/WorkflowEnginePage.tsx`

### `apps/web/src/components/docs/Breadcrumb.tsx`
- Imported by: `apps/web/src/app/legacy-pages/ApiReferencePage.tsx`, `apps/web/src/app/legacy-pages/IntroductionPage.tsx`, `apps/web/src/app/legacy-pages/SecurityPage.tsx`, `apps/web/src/app/legacy-pages/SetupPage.tsx`, `apps/web/src/app/legacy-pages/TechStackPage.tsx`, `apps/web/src/app/legacy-pages/WorkflowEnginePage.tsx`

### `apps/web/src/components/docs/CodeBlock.tsx`
- Imported by: `apps/web/src/app/legacy-pages/ApiReferencePage.tsx`, `apps/web/src/app/legacy-pages/DemoPage.tsx`, `apps/web/src/app/legacy-pages/SecurityPage.tsx`, `apps/web/src/app/legacy-pages/SetupPage.tsx`, `apps/web/src/app/legacy-pages/WorkflowEnginePage.tsx`, `apps/web/src/components/docs/DocArticle.tsx`

### `apps/web/src/components/docs/DocArticle.tsx`
- Imports: `apps/web/src/data/docs.ts`, `apps/web/src/components/docs/CodeBlock.tsx`
- Active repo usages: `resolveDoc` -> `apps/web/src/data/docs.ts` (call), `CodeBlock` -> `apps/web/src/components/docs/CodeBlock.tsx` (jsx)
- Imported by: `apps/web/src/app/docs/architecture/page.tsx`, `apps/web/src/app/docs/page.tsx`, `apps/web/src/app/docs/setup/page.tsx`, `apps/web/src/app/docs/tech-stack/page.tsx`, `apps/web/src/app/docs/workflow-engine/page.tsx`

### `apps/web/src/components/docs/DocsFrame.tsx`
- Imports: `apps/web/src/data/docs.ts`, `apps/web/src/data/docs.ts`
- Active repo usages: `DOC_NAV_GROUPS` -> `apps/web/src/data/docs.ts` (member), `resolveDoc` -> `apps/web/src/data/docs.ts` (call)

### `apps/web/src/components/docs/DocsSidebar.tsx`
- Imports: `apps/web/src/data/docsNavigation.ts`, `apps/web/src/types/index.ts`
- Active repo usages: `docsNavigation` -> `apps/web/src/data/docsNavigation.ts` (member)

### `apps/web/src/components/docs/OnThisPage.tsx`
- Imports: `apps/web/src/types/index.ts`
- Imported by: `apps/web/src/app/legacy-pages/IntroductionPage.tsx`, `apps/web/src/app/legacy-pages/SetupPage.tsx`, `apps/web/src/app/legacy-pages/WorkflowEnginePage.tsx`

### `apps/web/src/components/figma/ImageWithFallback.tsx`

### `apps/web/src/components/interactive/ConsoleOutput.tsx`
- Imports: `apps/web/src/types/index.ts`
- Imported by: `apps/web/src/app/legacy-pages/DemoPage.tsx`, `apps/web/src/components/interactive/WorkflowVisualizer.tsx`

### `apps/web/src/components/interactive/StatCounter.tsx`
- Imported by: `apps/web/src/components/landing/StatCounters.tsx`

### `apps/web/src/components/interactive/WorkflowSlider.tsx`
- Imports: `apps/web/src/components/ui/slider.tsx`
- Active repo usages: `Slider` -> `apps/web/src/components/ui/slider.tsx` (jsx)
- Imported by: `apps/web/src/components/interactive/WorkflowVisualizer.tsx`

### `apps/web/src/components/interactive/WorkflowVisualizer.tsx`
- Imports: `apps/web/src/components/interactive/WorkflowSlider.tsx`, `apps/web/src/components/interactive/ConsoleOutput.tsx`, `apps/web/src/components/shared/JsonViewer.tsx`, `apps/web/src/types/index.ts`
- Active repo usages: `WorkflowSlider` -> `apps/web/src/components/interactive/WorkflowSlider.tsx` (jsx), `ConsoleOutput` -> `apps/web/src/components/interactive/ConsoleOutput.tsx` (jsx), `JsonViewer` -> `apps/web/src/components/shared/JsonViewer.tsx` (jsx), `LogEntry` -> `apps/web/src/types/index.ts` (jsx)
- Imported by: `apps/web/src/app/legacy-pages/LandingPage.tsx`

### `apps/web/src/components/landing/AiCompilerDemo.tsx`

### `apps/web/src/components/landing/AnnouncementBar.tsx`
- Imported by: `apps/web/src/app/(landing)/layout.tsx`, `apps/web/src/app/docs/layout.tsx`

### `apps/web/src/components/landing/ArchitectureBoard.tsx`

### `apps/web/src/components/landing/FeatureGrid.tsx`
- Imported by: `apps/web/src/app/legacy-pages/LandingPage.tsx`

### `apps/web/src/components/landing/HeroSection.tsx`
- Imports: `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/shared/Terminal.tsx`, `apps/web/src/components/shared/Pill.tsx`
- Active repo usages: `Button` -> `apps/web/src/components/ui/button.tsx` (jsx), `Terminal` -> `apps/web/src/components/shared/Terminal.tsx` (jsx), `Pill` -> `apps/web/src/components/shared/Pill.tsx` (jsx)
- Imported by: `apps/web/src/app/legacy-pages/LandingPage.tsx`

### `apps/web/src/components/landing/LandingFooter.tsx`
- Imported by: `apps/web/src/app/(landing)/page.tsx`, `apps/web/src/app/(landing)/pricing/page.tsx`, `apps/web/src/app/docs/layout.tsx`, `apps/web/src/app/legacy-pages/LandingPage.tsx`

### `apps/web/src/components/landing/LandingNav.tsx`
- Imported by: `apps/web/src/app/(landing)/layout.tsx`, `apps/web/src/app/docs/layout.tsx`

### `apps/web/src/components/landing/StatCounters.tsx`
- Imports: `apps/web/src/components/interactive/StatCounter.tsx`
- Active repo usages: `StatCounter` -> `apps/web/src/components/interactive/StatCounter.tsx` (jsx)
- Imported by: `apps/web/src/app/legacy-pages/LandingPage.tsx`

### `apps/web/src/components/shared/JsonViewer.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/interactive/WorkflowVisualizer.tsx`

### `apps/web/src/components/shared/Pill.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/landing/HeroSection.tsx`

### `apps/web/src/components/shared/SectionLabel.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/shared/Terminal.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/landing/HeroSection.tsx`

### `apps/web/src/components/ui/accordion.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/alert-dialog.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/button.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `buttonVariants` -> `apps/web/src/components/ui/button.tsx` (call)

### `apps/web/src/components/ui/alert.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/aspect-ratio.tsx`

### `apps/web/src/components/ui/avatar.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/badge.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/breadcrumb.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/button.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/app/legacy-pages/NotFoundPage.tsx`, `apps/web/src/components/landing/HeroSection.tsx`, `apps/web/src/components/ui/alert-dialog.tsx`, `apps/web/src/components/ui/calendar.tsx`, `apps/web/src/components/ui/carousel.tsx`, `apps/web/src/components/ui/pagination.tsx`, `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/calendar.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/button.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `buttonVariants` -> `apps/web/src/components/ui/button.tsx` (call)

### `apps/web/src/components/ui/card.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/carousel.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/button.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `Button` -> `apps/web/src/components/ui/button.tsx` (jsx)

### `apps/web/src/components/ui/chart.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/checkbox.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/collapsible.tsx`

### `apps/web/src/components/ui/command.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/dialog.tsx`, `apps/web/src/components/ui/dialog.tsx`, `apps/web/src/components/ui/dialog.tsx`, `apps/web/src/components/ui/dialog.tsx`, `apps/web/src/components/ui/dialog.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `Dialog` -> `apps/web/src/components/ui/dialog.tsx` (jsx), `DialogContent` -> `apps/web/src/components/ui/dialog.tsx` (jsx), `DialogDescription` -> `apps/web/src/components/ui/dialog.tsx` (jsx), `DialogHeader` -> `apps/web/src/components/ui/dialog.tsx` (jsx), `DialogTitle` -> `apps/web/src/components/ui/dialog.tsx` (jsx)

### `apps/web/src/components/ui/context-menu.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/dialog.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/command.tsx`

### `apps/web/src/components/ui/drawer.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/dropdown-menu.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/form.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/label.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `Label` -> `apps/web/src/components/ui/label.tsx` (jsx)

### `apps/web/src/components/ui/hover-card.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/input-otp.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/input.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/label.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/form.tsx`

### `apps/web/src/components/ui/menubar.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/navigation-menu.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/pagination.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/button.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `buttonVariants` -> `apps/web/src/components/ui/button.tsx` (call)

### `apps/web/src/components/ui/popover.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/progress.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/radio-group.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/resizable.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/scroll-area.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/select.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/separator.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/sheet.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/sidebar.tsx`
- Imports: `apps/web/src/components/ui/use-mobile.ts`, `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/input.tsx`, `apps/web/src/components/ui/separator.tsx`, `apps/web/src/components/ui/sheet.tsx`, `apps/web/src/components/ui/sheet.tsx`, `apps/web/src/components/ui/sheet.tsx`, `apps/web/src/components/ui/sheet.tsx`, `apps/web/src/components/ui/sheet.tsx`, `apps/web/src/components/ui/skeleton.tsx`, `apps/web/src/components/ui/tooltip.tsx`, `apps/web/src/components/ui/tooltip.tsx`, `apps/web/src/components/ui/tooltip.tsx`, `apps/web/src/components/ui/tooltip.tsx`
- Active repo usages: `useIsMobile` -> `apps/web/src/components/ui/use-mobile.ts` (call), `cn` -> `apps/web/src/components/ui/utils.ts` (call), `Button` -> `apps/web/src/components/ui/button.tsx` (jsx), `Input` -> `apps/web/src/components/ui/input.tsx` (jsx), `Separator` -> `apps/web/src/components/ui/separator.tsx` (jsx), `Sheet` -> `apps/web/src/components/ui/sheet.tsx` (jsx), `SheetContent` -> `apps/web/src/components/ui/sheet.tsx` (jsx), `SheetDescription` -> `apps/web/src/components/ui/sheet.tsx` (jsx), `SheetHeader` -> `apps/web/src/components/ui/sheet.tsx` (jsx), `SheetTitle` -> `apps/web/src/components/ui/sheet.tsx` (jsx), `Skeleton` -> `apps/web/src/components/ui/skeleton.tsx` (jsx), `Tooltip` -> `apps/web/src/components/ui/tooltip.tsx` (jsx), `TooltipContent` -> `apps/web/src/components/ui/tooltip.tsx` (jsx), `TooltipProvider` -> `apps/web/src/components/ui/tooltip.tsx` (jsx), `TooltipTrigger` -> `apps/web/src/components/ui/tooltip.tsx` (jsx)

### `apps/web/src/components/ui/skeleton.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/slider.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/interactive/WorkflowSlider.tsx`

### `apps/web/src/components/ui/sonner.tsx`
- Imported by: `apps/web/src/app/layout.tsx`

### `apps/web/src/components/ui/switch.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/table.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/tabs.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/textarea.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)

### `apps/web/src/components/ui/toggle-group.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`, `apps/web/src/components/ui/toggle.tsx`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call), `toggleVariants` -> `apps/web/src/components/ui/toggle.tsx` (call)

### `apps/web/src/components/ui/toggle.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/toggle-group.tsx`

### `apps/web/src/components/ui/tooltip.tsx`
- Imports: `apps/web/src/components/ui/utils.ts`
- Active repo usages: `cn` -> `apps/web/src/components/ui/utils.ts` (call)
- Imported by: `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/use-mobile.ts`
- Imported by: `apps/web/src/components/ui/sidebar.tsx`

### `apps/web/src/components/ui/utils.ts`
- Imported by: `apps/web/src/components/docs/AlertBox.tsx`, `apps/web/src/components/shared/JsonViewer.tsx`, `apps/web/src/components/shared/Pill.tsx`, `apps/web/src/components/shared/SectionLabel.tsx`, `apps/web/src/components/shared/Terminal.tsx`, `apps/web/src/components/ui/accordion.tsx`, `apps/web/src/components/ui/alert-dialog.tsx`, `apps/web/src/components/ui/alert.tsx`, `apps/web/src/components/ui/avatar.tsx`, `apps/web/src/components/ui/badge.tsx`, `apps/web/src/components/ui/breadcrumb.tsx`, `apps/web/src/components/ui/button.tsx`, `apps/web/src/components/ui/calendar.tsx`, `apps/web/src/components/ui/card.tsx`, `apps/web/src/components/ui/carousel.tsx`, `apps/web/src/components/ui/chart.tsx`, `apps/web/src/components/ui/checkbox.tsx`, `apps/web/src/components/ui/command.tsx`, `apps/web/src/components/ui/context-menu.tsx`, `apps/web/src/components/ui/dialog.tsx`, `apps/web/src/components/ui/drawer.tsx`, `apps/web/src/components/ui/dropdown-menu.tsx`, `apps/web/src/components/ui/form.tsx`, `apps/web/src/components/ui/hover-card.tsx`, `apps/web/src/components/ui/input-otp.tsx`, `apps/web/src/components/ui/input.tsx`, `apps/web/src/components/ui/label.tsx`, `apps/web/src/components/ui/menubar.tsx`, `apps/web/src/components/ui/navigation-menu.tsx`, `apps/web/src/components/ui/pagination.tsx`, `apps/web/src/components/ui/popover.tsx`, `apps/web/src/components/ui/progress.tsx`, `apps/web/src/components/ui/radio-group.tsx`, `apps/web/src/components/ui/resizable.tsx`, `apps/web/src/components/ui/scroll-area.tsx`, `apps/web/src/components/ui/select.tsx`, `apps/web/src/components/ui/separator.tsx`, `apps/web/src/components/ui/sheet.tsx`, `apps/web/src/components/ui/sidebar.tsx`, `apps/web/src/components/ui/skeleton.tsx`, `apps/web/src/components/ui/slider.tsx`, `apps/web/src/components/ui/switch.tsx`, `apps/web/src/components/ui/table.tsx`, `apps/web/src/components/ui/tabs.tsx`, `apps/web/src/components/ui/textarea.tsx`, `apps/web/src/components/ui/toggle-group.tsx`, `apps/web/src/components/ui/toggle.tsx`, `apps/web/src/components/ui/tooltip.tsx`

### `apps/web/src/data/docs.ts`
- Imported by: `apps/web/src/components/docs/DocArticle.tsx`, `apps/web/src/components/docs/DocsFrame.tsx`, `apps/web/src/data/docsNavigation.ts`

### `apps/web/src/data/docsNavigation.ts`
- Imports: `apps/web/src/types/index.ts`, `apps/web/src/data/docs.ts`
- Active repo usages: `DOC_NAV_GROUPS` -> `apps/web/src/data/docs.ts` (member)
- Imported by: `apps/web/src/components/docs/DocsSidebar.tsx`

### `apps/web/src/lib/api.ts`
- Imported by: `apps/web/src/lib/auth.ts`

### `apps/web/src/lib/auth.ts`
- Imports: `apps/web/src/lib/api.ts`
- Active repo usages: `api` -> `apps/web/src/lib/api.ts` (member)

### `apps/web/src/lib/console-api.ts`
- Imports: `apps/web/src/lib/enforcement/tenantGuard.ts`, `apps/web/src/types/contracts.ts`, `apps/web/src/types/contracts.ts`, `apps/web/src/types/contracts.ts`, `apps/web/src/types/contracts.ts`
- Active repo usages: `assertTenantContext` -> `apps/web/src/lib/enforcement/tenantGuard.ts` (call)
- Imported by: `apps/web/src/app/console/ai/page.tsx`, `apps/web/src/app/console/events/page.tsx`, `apps/web/src/app/console/page.tsx`, `apps/web/src/app/console/projects/page.tsx`, `apps/web/src/app/console/templates/page.tsx`, `apps/web/src/app/console/workflows/page.tsx`, `apps/web/src/components/console/ConsoleProvider.tsx`, `apps/web/src/lib/enforcement/tenantGuard.ts`, `apps/web/src/lib/stores/event-store.ts`, `apps/web/src/lib/stores/workflow-store.ts`
- API calls: `getCurrentUser` [GET] -> /api/auth/me, `listProjects` [GET] -> /api/projects, `createProject` [POST] -> /api/projects, `listWorkflows` [GET] -> /api/workflows, `createWorkflow` [POST] -> /api/workflows, `deployWorkflow` [POST] -> /api/workflows/{workflowId}/deploy, `listApplications` [GET] -> /api/applications, `listEvents` [GET] -> /api/events, `compileBlueprint` [POST] -> /api/ai/compile, `deployBlueprint` [POST] -> /api/ai/deploy/{proposalId}, `getTemplate` [GET] -> /api/templates/{id}, `deployTemplate` [POST] -> /api/templates/{templateId}/deploy, `customizeTemplate` [POST] -> /api/templates/{id}/customize, `getOrCreateArchitecture` [GET] -> /api/architect, `getOrCreateArchitecture` [POST] -> /api/architect, `applyArchitectPrompt` [POST] -> /api/architect/{archId}/prompt, `linkWorkflowToDomain` [POST] -> /api/architect/{archId}/link-workflow, `getAvailableWorkflows` [GET] -> /api/architect/{archId}/available-workflows, `getArchitectureVersions` [GET] -> /api/architect/{archId}/versions

### `apps/web/src/lib/enforcement/deploymentGuard.ts`
- Imported by: `apps/web/src/app/console/ai/page.tsx`

### `apps/web/src/lib/enforcement/immutabilityGuard.ts`
- Imported by: `apps/web/src/app/console/workflows/[id]/edit/page.tsx`

### `apps/web/src/lib/enforcement/tenantGuard.ts`
- Imports: `apps/web/src/lib/console-api.ts`
- Imported by: `apps/web/src/lib/console-api.ts`

### `apps/web/src/lib/enforcement/validationGuard.ts`
- Imports: `apps/web/src/types/contracts.ts`
- Imported by: `apps/web/src/app/console/ai/page.tsx`, `apps/web/src/app/console/workflows/[id]/edit/page.tsx`

### `apps/web/src/lib/hooks/useEventStream.ts`
- Imports: `apps/web/src/lib/stores/event-store.ts`
- Active repo usages: `useEventStore` -> `apps/web/src/lib/stores/event-store.ts` (call)
- Imported by: `apps/web/src/app/console/events/page.tsx`, `apps/web/src/app/console/page.tsx`
- API calls: `backfill` [GET] -> /api/events, `connect` [WEBSOCKET] -> /api/events/ws

### `apps/web/src/lib/react-router-compat.tsx`

### `apps/web/src/lib/stores/auth-store.ts`
- Imported by: `apps/web/src/components/console/ConsoleProvider.tsx`

### `apps/web/src/lib/stores/blueprint-store.ts`
- Imports: `apps/web/src/types/contracts.ts`, `apps/web/src/types/contracts.ts`
- Imported by: `apps/web/src/app/console/ai/page.tsx`, `apps/web/src/app/console/workflows/[id]/edit/page.tsx`, `apps/web/src/components/console/ConsoleProvider.tsx`

### `apps/web/src/lib/stores/event-store.ts`
- Imports: `apps/web/src/lib/console-api.ts`
- Imported by: `apps/web/src/app/console/events/page.tsx`, `apps/web/src/app/console/page.tsx`, `apps/web/src/components/console/ConsoleProvider.tsx`, `apps/web/src/lib/hooks/useEventStream.ts`

### `apps/web/src/lib/stores/project-context-store.ts`
- Imported by: `apps/web/src/app/console/ai/page.tsx`, `apps/web/src/app/console/api-keys/page.tsx`, `apps/web/src/app/console/architect/page.tsx`, `apps/web/src/app/console/events/page.tsx`, `apps/web/src/app/console/page.tsx`, `apps/web/src/app/console/projects/page.tsx`, `apps/web/src/app/console/settings/page.tsx`, `apps/web/src/app/console/templates/page.tsx`, `apps/web/src/app/console/workflows/page.tsx`, `apps/web/src/components/console/ConsoleProvider.tsx`, `apps/web/src/components/console/ConsoleShell.tsx`

### `apps/web/src/lib/stores/project-store.ts`
- Imported by: `apps/web/src/app/console/projects/page.tsx`, `apps/web/src/components/console/ConsoleProvider.tsx`, `apps/web/src/components/console/ConsoleShell.tsx`

### `apps/web/src/lib/stores/workflow-store.ts`
- Imports: `apps/web/src/lib/console-api.ts`
- Imported by: `apps/web/src/app/console/ai/page.tsx`, `apps/web/src/app/console/page.tsx`, `apps/web/src/app/console/workflows/[id]/edit/page.tsx`, `apps/web/src/app/console/workflows/[id]/page.tsx`, `apps/web/src/app/console/workflows/page.tsx`, `apps/web/src/components/console/ConsoleProvider.tsx`

### `apps/web/src/types/contracts.ts`
- Imported by: `apps/web/src/app/console/ai/page.tsx`, `apps/web/src/lib/console-api.ts`, `apps/web/src/lib/enforcement/validationGuard.ts`, `apps/web/src/lib/stores/blueprint-store.ts`

### `apps/web/src/types/index.ts`
- Imported by: `apps/web/src/app/legacy-pages/DemoPage.tsx`, `apps/web/src/app/legacy-pages/IntroductionPage.tsx`, `apps/web/src/app/legacy-pages/SetupPage.tsx`, `apps/web/src/app/legacy-pages/WorkflowEnginePage.tsx`, `apps/web/src/components/docs/DocsSidebar.tsx`, `apps/web/src/components/docs/OnThisPage.tsx`, `apps/web/src/components/interactive/ConsoleOutput.tsx`, `apps/web/src/components/interactive/WorkflowVisualizer.tsx`, `apps/web/src/data/docsNavigation.ts`

## Backend Endpoints

- `DELETE /api/api-keys/{key_id}` -> `apps/api/app/routes/api_keys.py::revoke_api_key`
- `GET /` -> `apps/api/app/main.py::root`
- `GET /api/api-keys` -> `apps/api/app/routes/api_keys.py::list_api_keys`
- `GET /api/applications` -> `apps/api/app/routes/applications.py::list_applications`
- `GET /api/architect` -> `apps/api/app/routes/architect.py::get_or_list_architectures`
- `GET /api/architect/{arch_id}` -> `apps/api/app/routes/architect.py::get_architecture`
- `GET /api/architect/{arch_id}/available-workflows` -> `apps/api/app/routes/architect.py::available_workflows`
- `GET /api/architect/{arch_id}/versions` -> `apps/api/app/routes/architect.py::list_versions`
- `GET /api/architect/{arch_id}/visualization` -> `apps/api/app/routes/architect.py::get_visualization`
- `GET /api/auth/me` -> `apps/api/app/routes/auth.py::me`
- `GET /api/events` -> `apps/api/app/routes/events.py::list_events`
- `GET /api/projects` -> `apps/api/app/routes/projects.py::list_projects`
- `GET /api/templates` -> `apps/api/app/routes/templates.py::list_templates`
- `GET /api/templates/{template_id}` -> `apps/api/app/routes/templates.py::get_template`
- `GET /api/workflows` -> `apps/api/app/routes/workflows.py::list_workflows`
- `GET /audit-log` -> `apps/api/app/routes/admin.py::get_audit_log`
- `GET /dashboard` -> `apps/api/app/routes/admin.py::get_dashboard`
- `GET /health` -> `apps/api/app/main.py::health`
- `GET /metrics` -> `apps/api/app/main.py::metrics`
- `POST /api/ai/blueprints/compile` -> `apps/api/app/routes/ai.py::compile_blueprint`
- `POST /api/ai/blueprints/{proposal_id}/deploy` -> `apps/api/app/routes/ai.py::deploy_blueprint`
- `POST /api/api-keys` -> `apps/api/app/routes/api_keys.py::create_api_key`
- `POST /api/applications` -> `apps/api/app/routes/applications.py::create_application`
- `POST /api/applications/{application_id}/transition` -> `apps/api/app/routes/applications.py::transition_application`
- `POST /api/architect` -> `apps/api/app/routes/architect.py::create_architecture`
- `POST /api/architect/{arch_id}/link-workflow` -> `apps/api/app/routes/architect.py::link_workflow`
- `POST /api/architect/{arch_id}/prompt` -> `apps/api/app/routes/architect.py::apply_prompt`
- `POST /api/auth/login` -> `apps/api/app/routes/auth.py::login`
- `POST /api/auth/register` -> `apps/api/app/routes/auth.py::register`
- `POST /api/projects` -> `apps/api/app/routes/projects.py::create_project`
- `POST /api/templates/{template_id}/customize` -> `apps/api/app/routes/templates.py::customize_template`
- `POST /api/templates/{template_id}/deploy` -> `apps/api/app/routes/templates.py::deploy_template`
- `POST /api/workflows` -> `apps/api/app/routes/workflows.py::create_workflow`
- `POST /api/workflows/{workflow_id}/deploy` -> `apps/api/app/routes/workflows.py::deploy_workflow`
- `PUT /api/workflows/{workflow_id}` -> `apps/api/app/routes/workflows.py::update_workflow`
- `WEBSOCKET /api/events/ws` -> `apps/api/app/main.py::events_ws`
