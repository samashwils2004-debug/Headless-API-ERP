-- AdmitFlow RLS policies (institution + project scoped)
-- Apply after migrations on PostgreSQL/Supabase.

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprint_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_role_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_scope_select ON projects
FOR SELECT TO authenticated
USING (
  institution_id = (auth.jwt() ->> 'institution_id')
  AND id = COALESCE(auth.jwt() ->> 'project_id', id)
);

CREATE POLICY workflows_scope_select ON workflows
FOR SELECT TO authenticated
USING (
  institution_id = (auth.jwt() ->> 'institution_id')
  AND project_id = COALESCE(auth.jwt() ->> 'project_id', project_id)
);

CREATE POLICY applications_scope_select ON applications
FOR SELECT TO authenticated
USING (
  institution_id = (auth.jwt() ->> 'institution_id')
  AND project_id = COALESCE(auth.jwt() ->> 'project_id', project_id)
);

CREATE POLICY events_scope_select ON events
FOR SELECT TO authenticated
USING (
  institution_id = (auth.jwt() ->> 'institution_id')
  AND project_id = COALESCE(auth.jwt() ->> 'project_id', project_id)
);

CREATE POLICY proposals_scope_select ON blueprint_proposals
FOR SELECT TO authenticated
USING (
  institution_id = (auth.jwt() ->> 'institution_id')
  AND project_id = COALESCE(auth.jwt() ->> 'project_id', project_id)
);

CREATE POLICY users_tenant_select ON users
FOR SELECT TO authenticated
USING (institution_id = (auth.jwt() ->> 'institution_id'));

CREATE POLICY role_permissions_read ON role_permissions
FOR SELECT TO authenticated
USING (true);

CREATE POLICY project_bindings_scope_select ON project_role_bindings
FOR SELECT TO authenticated
USING (
  institution_id = (auth.jwt() ->> 'institution_id')
  AND project_id = COALESCE(auth.jwt() ->> 'project_id', project_id)
);
