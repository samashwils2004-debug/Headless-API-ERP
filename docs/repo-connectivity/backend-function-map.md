# Backend Function Connectivity

Filter: runtime backend Python only under `apps/api/app/**/*.py`.

## `apps/api/app/__init__.py`

## `apps/api/app/ai/__init__.py`

Imports from repo:
- `BlueprintGenerator` -> `apps/api/app/ai/blueprint_generator.py::BlueprintGenerator` (class)
- `BlueprintCompiler` -> `apps/api/app/ai/blueprint_generator.py::BlueprintCompiler` (symbol)

## `apps/api/app/ai/architect/__init__.py`

Imports from repo:
- `NLPIntentParser` -> `apps/api/app/ai/architect/nlp_intent_parser.py::NLPIntentParser` (class)
- `ParsedIntent` -> `apps/api/app/ai/architect/nlp_intent_parser.py::ParsedIntent` (class)
- `ERPVisualizationGenerator` -> `apps/api/app/ai/architect/visualization_generator.py::ERPVisualizationGenerator` (class)

## `apps/api/app/ai/architect/erp_schema.py`

Imported by:
- `apps/api/app/routes/architect.py`

## `apps/api/app/ai/architect/nlp_intent_parser.py`

Imported by:
- `apps/api/app/ai/architect/__init__.py`
- `apps/api/app/routes/architect.py`

### `NLPIntentParser.parse`
- Line: `95`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/architect/nlp_intent_parser.py::ParsedIntent` (local-class)
  - `apps/api/app/ai/architect/nlp_intent_parser.py::ParsedIntent` (local-class)
- Called by: none resolved from repo symbols

## `apps/api/app/ai/architect/prompt_factory.py`

Imported by:
- `apps/api/app/routes/architect.py`

### `ERPPromptFactory.build`
- Line: `12`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ai/architect/visualization_generator.py`

Imported by:
- `apps/api/app/ai/architect/__init__.py`
- `apps/api/app/routes/architect.py`

### `ERPVisualizationGenerator.generate`
- Line: `32`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ai/blueprint_generator.py`

Imports from repo:
- `analyze_graph` -> `apps/api/app/ai/validators/__init__.py::analyze_graph` (symbol)
- `analyze_permissions` -> `apps/api/app/ai/validators/__init__.py::analyze_permissions` (symbol)
- `check_compliance` -> `apps/api/app/ai/validators/__init__.py::check_compliance` (symbol)
- `validate_schema` -> `apps/api/app/ai/validators/__init__.py::validate_schema` (symbol)
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)
- `SchemaEngine` -> `apps/api/app/core/schema_engine.py::SchemaEngine` (class)
- `BLUEPRINT_VALIDATION_FAILURES` -> `apps/api/app/observability.py::BLUEPRINT_VALIDATION_FAILURES` (symbol)
- `get_provider_router` -> `apps/api/app/ai/provider_router.py::get_provider_router` (function)

Imported by:
- `apps/api/app/ai/__init__.py`
- `apps/api/app/routes/ai.py`

### `BlueprintGenerator.__init__`
- Line: `20`
- Kind: `method`
- Calls:
  - `apps/api/app/config.py::get_settings` (imported)
  - `apps/api/app/core/schema_engine.py::SchemaEngine` (imported)
- Called by: none resolved from repo symbols

### `BlueprintGenerator.compile`
- Line: `24`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/provider_router.py::get_provider_router` (imported)
- Called by: none resolved from repo symbols

### `BlueprintGenerator.validate`
- Line: `40`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/validators/__init__.py::validate_schema` (imported)
  - `apps/api/app/ai/validators/__init__.py::analyze_graph` (imported)
  - `apps/api/app/ai/validators/__init__.py::analyze_permissions` (imported)
  - `apps/api/app/ai/validators/__init__.py::check_compliance` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/ai/provider_router.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)

Imported by:
- `apps/api/app/ai/blueprint_generator.py`
- `apps/api/app/ai/template_customizer/customizer.py`
- `apps/api/app/routes/architect.py`

### `ProviderRouter.__init__`
- Line: `61`
- Kind: `method`
- Calls:
  - `apps/api/app/config.py::get_settings` (imported)
  - `apps/api/app/ai/provider_router.py::ProviderRouter._init_clients` (self-method)
- Called by: none resolved from repo symbols

### `ProviderRouter._build_system_prompt`
- Line: `115`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/ai/provider_router.py::ProviderRouter._try_gemini` (self-method)
  - `apps/api/app/ai/provider_router.py::ProviderRouter._try_groq` (self-method)

### `ProviderRouter._get_cache`
- Line: `96`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/ai/provider_router.py::ProviderRouter.generate` (self-method)

### `ProviderRouter._init_clients`
- Line: `68`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/ai/provider_router.py::ProviderRouter.__init__` (self-method)

### `ProviderRouter._set_cache`
- Line: `107`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/ai/provider_router.py::ProviderRouter.generate` (self-method)

### `ProviderRouter._try_gemini`
- Line: `142`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/provider_router.py::ProviderRouter._build_system_prompt` (self-method)
- Called by:
  - `apps/api/app/ai/provider_router.py::ProviderRouter.generate` (self-method)

### `ProviderRouter._try_groq`
- Line: `160`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/provider_router.py::ProviderRouter._build_system_prompt` (self-method)
- Called by:
  - `apps/api/app/ai/provider_router.py::ProviderRouter.generate` (self-method)

### `ProviderRouter.generate`
- Line: `181`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/provider_router.py::ProviderRouter._get_cache` (self-method)
  - `apps/api/app/ai/provider_router.py::ProviderRouter._try_gemini` (self-method)
  - `apps/api/app/ai/provider_router.py::ProviderRouter._try_groq` (self-method)
  - `apps/api/app/ai/provider_router.py::ProviderRouter._set_cache` (self-method)
- Called by: none resolved from repo symbols

### `_cache_key`
- Line: `17`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `_mock_blueprint`
- Line: `22`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `get_provider_router`
- Line: `225`
- Kind: `function`
- Calls:
  - `apps/api/app/ai/provider_router.py::ProviderRouter` (local-class)
- Called by:
  - `apps/api/app/ai/blueprint_generator.py::BlueprintGenerator.compile` (imported)
  - `apps/api/app/ai/template_customizer/customizer.py::TemplateCustomizer.customize` (imported)
  - `apps/api/app/routes/architect.py::apply_prompt` (imported)

## `apps/api/app/ai/template_customizer/__init__.py`

Imports from repo:
- `TemplateCustomizer` -> `apps/api/app/ai/template_customizer/customizer.py::TemplateCustomizer` (class)

Imported by:
- `apps/api/app/routes/templates.py`

## `apps/api/app/ai/template_customizer/customizer.py`

Imports from repo:
- `get_provider_router` -> `apps/api/app/ai/provider_router.py::get_provider_router` (function)
- `analyze_graph` -> `apps/api/app/ai/validators/__init__.py::analyze_graph` (symbol)
- `analyze_permissions` -> `apps/api/app/ai/validators/__init__.py::analyze_permissions` (symbol)
- `check_compliance` -> `apps/api/app/ai/validators/__init__.py::check_compliance` (symbol)
- `validate_schema` -> `apps/api/app/ai/validators/__init__.py::validate_schema` (symbol)
- `SchemaEngine` -> `apps/api/app/core/schema_engine.py::SchemaEngine` (class)

Imported by:
- `apps/api/app/ai/template_customizer/__init__.py`

### `TemplateCustomizer.__init__`
- Line: `117`
- Kind: `method`
- Calls:
  - `apps/api/app/core/schema_engine.py::SchemaEngine` (imported)
- Called by: none resolved from repo symbols

### `TemplateCustomizer.customize`
- Line: `120`
- Kind: `method`
- Calls:
  - `apps/api/app/ai/provider_router.py::get_provider_router` (imported)
  - `apps/api/app/ai/validators/__init__.py::analyze_graph` (imported)
  - `apps/api/app/ai/validators/__init__.py::analyze_graph` (imported)
  - `apps/api/app/ai/validators/__init__.py::analyze_permissions` (imported)
  - `apps/api/app/ai/validators/__init__.py::check_compliance` (imported)
- Called by: none resolved from repo symbols

### `_build_prompt`
- Line: `37`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `_compute_diff`
- Line: `66`
- Kind: `function`
- Calls:
  - `apps/api/app/ai/template_customizer/customizer.py::_diff_summary` (local)
- Called by: none resolved from repo symbols

### `_diff_summary`
- Line: `100`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/ai/template_customizer/customizer.py::_compute_diff` (local)

### `_mock_customization`
- Line: `56`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ai/validators/__init__.py`

Imports from repo:
- `validate_schema` -> `apps/api/app/ai/validators/schema_validator.py::validate_schema` (function)
- `analyze_graph` -> `apps/api/app/ai/validators/graph_analyzer.py::analyze_graph` (function)
- `analyze_permissions` -> `apps/api/app/ai/validators/permission_analyzer.py::analyze_permissions` (function)
- `check_compliance` -> `apps/api/app/ai/validators/compliance_checker.py::check_compliance` (function)

Imported by:
- `apps/api/app/ai/blueprint_generator.py`
- `apps/api/app/ai/template_customizer/customizer.py`

## `apps/api/app/ai/validators/compliance_checker.py`

Imported by:
- `apps/api/app/ai/validators/__init__.py`

### `check_compliance`
- Line: `6`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ai/validators/graph_analyzer.py`

Imported by:
- `apps/api/app/ai/validators/__init__.py`

### `analyze_graph`
- Line: `7`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ai/validators/permission_analyzer.py`

Imported by:
- `apps/api/app/ai/validators/__init__.py`

### `analyze_permissions`
- Line: `6`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ai/validators/schema_validator.py`

Imported by:
- `apps/api/app/ai/validators/__init__.py`

### `validate_schema`
- Line: `6`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/auth/__init__.py`

## `apps/api/app/config.py`

Imported by:
- `apps/api/app/ai/blueprint_generator.py`
- `apps/api/app/ai/provider_router.py`
- `apps/api/app/core/event_engine.py`
- `apps/api/app/database.py`
- `apps/api/app/main.py`
- `apps/api/app/routes/auth.py`
- `apps/api/app/security.py`
- `apps/api/app/storage.py`

### `Settings.normalize_debug`
- Line: `63`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `Settings.validate_database_url`
- Line: `81`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `Settings.validate_secret_key`
- Line: `74`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `get_settings`
- Line: `94`
- Kind: `function`
- Calls:
  - `apps/api/app/config.py::Settings` (local-class)
- Called by:
  - `apps/api/app/ai/blueprint_generator.py::BlueprintGenerator.__init__` (imported)
  - `apps/api/app/ai/provider_router.py::ProviderRouter.__init__` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.__init__` (imported)

## `apps/api/app/core/__init__.py`

## `apps/api/app/core/condition_parser.py`

Imported by:
- `apps/api/app/core/workflow_engine.py`

### `ConditionParser._parse_comparison`
- Line: `66`
- Kind: `method`
- Calls:
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::Comparison` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParser._parse_value` (self-method)
- Called by:
  - `apps/api/app/core/condition_parser.py::ConditionParser.parse` (self-method)

### `ConditionParser._parse_value`
- Line: `79`
- Kind: `method`
- Calls:
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
- Called by:
  - `apps/api/app/core/condition_parser.py::ConditionParser._parse_comparison` (self-method)

### `ConditionParser.parse`
- Line: `48`
- Kind: `method`
- Calls:
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParser.tokenize` (self-method)
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParser._parse_comparison` (self-method)
  - `apps/api/app/core/condition_parser.py::ConditionParser._parse_comparison` (self-method)
  - `apps/api/app/core/condition_parser.py::Logical` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParser._parse_comparison` (self-method)
- Called by:
  - `apps/api/app/core/condition_parser.py::evaluate_condition` (instance-method)

### `ConditionParser.tokenize`
- Line: `33`
- Kind: `method`
- Calls:
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParseError` (local-class)
- Called by:
  - `apps/api/app/core/condition_parser.py::ConditionParser.parse` (self-method)

### `evaluate_condition`
- Line: `93`
- Kind: `function`
- Calls:
  - `apps/api/app/core/condition_parser.py::ConditionParser` (local-class)
  - `apps/api/app/core/condition_parser.py::ConditionParser.parse` (instance-method)
- Called by:
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine.execute_until_wait` (imported)

## `apps/api/app/core/event_engine.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)
- `Event` -> `apps/api/app/models/__init__.py::Event` (class)
- `EVENT_STREAM_APPEND_FAILURES` -> `apps/api/app/observability.py::EVENT_STREAM_APPEND_FAILURES` (symbol)
- `EVENTS_EMITTED` -> `apps/api/app/observability.py::EVENTS_EMITTED` (symbol)
- `normalize_event_type` -> `apps/api/app/observability.py::normalize_event_type` (function)
- `utcnow_naive` -> `apps/api/app/time_utils.py::utcnow_naive` (function)
- `hub` -> `apps/api/app/ws.py::hub` (symbol)

Imported by:
- `apps/api/app/core/workflow_engine.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/applications.py`
- `apps/api/app/routes/workflows.py`

### `EventEngine.__init__`
- Line: `19`
- Kind: `method`
- Calls:
  - `apps/api/app/config.py::get_settings` (imported)
- Called by: none resolved from repo symbols

### `EventEngine.emit`
- Line: `29`
- Kind: `method`
- Calls:
  - `apps/api/app/models/__init__.py::Event` (imported)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/observability.py::normalize_event_type` (imported)
- Called by:
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine.execute_until_wait` (instance-method)
  - `apps/api/app/routes/ai.py::deploy_blueprint` (instance-method)
  - `apps/api/app/routes/applications.py::create_application` (instance-method)
  - `apps/api/app/routes/applications.py::transition_application` (instance-method)
  - `apps/api/app/routes/workflows.py::deploy_workflow` (instance-method)

## `apps/api/app/core/rbac_engine.py`

Imports from repo:
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `ProjectRoleBinding` -> `apps/api/app/models/__init__.py::ProjectRoleBinding` (class)
- `RolePermission` -> `apps/api/app/models/__init__.py::RolePermission` (class)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)
- `TenantContext` -> `apps/api/app/tenant.py::TenantContext` (class)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)

Imported by:
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/api_keys.py`
- `apps/api/app/routes/applications.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/routes/events.py`
- `apps/api/app/routes/projects.py`
- `apps/api/app/routes/templates.py`
- `apps/api/app/routes/workflows.py`

### `RBACEngine.__init__`
- Line: `49`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `RBACEngine.assert_project_scope`
- Line: `62`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/core/rbac_engine.py::check_permission` (instance-method)

### `RBACEngine.has_permission`
- Line: `52`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/core/rbac_engine.py::check_permission` (instance-method)

### `check_permission`
- Line: `79`
- Kind: `function`
- Calls:
  - `apps/api/app/core/rbac_engine.py::RBACEngine` (local-class)
  - `apps/api/app/core/rbac_engine.py::RBACEngine.assert_project_scope` (instance-method)
  - `apps/api/app/core/rbac_engine.py::RBACEngine.has_permission` (instance-method)
- Called by:
  - `apps/api/app/routes/ai.py::compile_blueprint` (imported)
  - `apps/api/app/routes/ai.py::deploy_blueprint` (imported)
  - `apps/api/app/routes/api_keys.py::list_api_keys` (imported)
  - `apps/api/app/routes/api_keys.py::create_api_key` (imported)
  - `apps/api/app/routes/api_keys.py::revoke_api_key` (imported)
  - `apps/api/app/routes/applications.py::create_application` (imported)
  - `apps/api/app/routes/applications.py::list_applications` (imported)
  - `apps/api/app/routes/applications.py::transition_application` (imported)
  - `apps/api/app/routes/events.py::list_events` (imported)
  - `apps/api/app/routes/projects.py::list_projects` (imported)
  - `apps/api/app/routes/projects.py::create_project` (imported)
  - `apps/api/app/routes/templates.py::deploy_template` (imported)
  - `apps/api/app/routes/workflows.py::list_workflows` (imported)
  - `apps/api/app/routes/workflows.py::create_workflow` (imported)
  - `apps/api/app/routes/workflows.py::deploy_workflow` (imported)
  - `apps/api/app/routes/workflows.py::update_workflow` (imported)

## `apps/api/app/core/schema_engine.py`

Imported by:
- `apps/api/app/ai/blueprint_generator.py`
- `apps/api/app/ai/template_customizer/customizer.py`
- `apps/api/app/routes/applications.py`

### `SchemaEngine.__init__`
- Line: `70`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `SchemaEngine.validate_application`
- Line: `74`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/applications.py::create_application` (instance-method)

### `SchemaEngine.validate_blueprint`
- Line: `78`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/core/workflow_engine.py`

Imports from repo:
- `evaluate_condition` -> `apps/api/app/core/condition_parser.py::evaluate_condition` (function)
- `EventEngine` -> `apps/api/app/core/event_engine.py::EventEngine` (class)
- `Application` -> `apps/api/app/models/__init__.py::Application` (class)
- `Workflow` -> `apps/api/app/models/__init__.py::Workflow` (class)
- `WORKFLOW_EXECUTION_TIME_MS` -> `apps/api/app/observability.py::WORKFLOW_EXECUTION_TIME_MS` (symbol)
- `utcnow_naive` -> `apps/api/app/time_utils.py::utcnow_naive` (function)

Imported by:
- `apps/api/app/routes/applications.py`

### `WorkflowEngine.__init__`
- Line: `22`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `WorkflowEngine._is_deadlock`
- Line: `26`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine.execute_until_wait` (self-method)

### `WorkflowEngine._validate_definition`
- Line: `29`
- Kind: `method`
- Calls:
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
- Called by:
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine.execute_until_wait` (self-method)

### `WorkflowEngine.execute_until_wait`
- Line: `48`
- Kind: `method`
- Calls:
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine._validate_definition` (self-method)
  - `apps/api/app/core/condition_parser.py::evaluate_condition` (imported)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (instance-method)
  - `apps/api/app/core/event_engine.py::EventEngine` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (instance-method)
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine._is_deadlock` (self-method)
  - `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (local-class)
- Called by:
  - `apps/api/app/routes/applications.py::create_application` (instance-method)

## `apps/api/app/database.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)
- `models` -> `apps/api/app/models/__init__.py` (module)

Imported by:
- `apps/api/app/core/rbac_engine.py`
- `apps/api/app/db/__init__.py`
- `apps/api/app/main.py`
- `apps/api/app/models/__init__.py`
- `apps/api/app/routes/admin.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/api_keys.py`
- `apps/api/app/routes/applications.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/routes/auth.py`
- `apps/api/app/routes/events.py`
- `apps/api/app/routes/projects.py`
- `apps/api/app/routes/templates.py`
- `apps/api/app/routes/workflows.py`
- `apps/api/app/security.py`

### `get_db`
- Line: `56`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `init_db`
- Line: `65`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/main.py::lifespan` (imported)

## `apps/api/app/db/__init__.py`

Imports from repo:
- `Base` -> `apps/api/app/database.py::Base` (symbol)
- `SessionLocal` -> `apps/api/app/database.py::SessionLocal` (symbol)
- `engine` -> `apps/api/app/database.py::engine` (symbol)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `init_db` -> `apps/api/app/database.py::init_db` (function)

## `apps/api/app/main.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)
- `init_db` -> `apps/api/app/database.py::init_db` (function)
- `RateLimitMiddleware` -> `apps/api/app/middleware/rate_limit.py::RateLimitMiddleware` (class)
- `metrics_response` -> `apps/api/app/observability.py::metrics_response` (function)
- `record_http_metrics` -> `apps/api/app/observability.py::record_http_metrics` (function)
- `ai` -> `apps/api/app/routes/ai.py` (module)
- `applications` -> `apps/api/app/routes/applications.py` (module)
- `auth` -> `apps/api/app/routes/auth.py` (module)
- `events` -> `apps/api/app/routes/events.py` (module)
- `projects` -> `apps/api/app/routes/projects.py` (module)
- `workflows` -> `apps/api/app/routes/workflows.py` (module)
- `api_keys` -> `apps/api/app/routes/api_keys.py` (module)
- `templates` -> `apps/api/app/routes/templates.py` (module)
- `architect` -> `apps/api/app/routes/architect.py` (module)
- `hub` -> `apps/api/app/ws.py::hub` (symbol)

### `events_ws`
- Line: `126`
- Kind: `function`
- Routes: `WEBSOCKET /api/events/ws`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `health`
- Line: `116`
- Kind: `function`
- Routes: `GET /health`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `lifespan`
- Line: `35`
- Kind: `function`
- Calls:
  - `apps/api/app/database.py::init_db` (imported)
- Called by: none resolved from repo symbols

### `metrics`
- Line: `121`
- Kind: `function`
- Routes: `GET /metrics`
- Calls:
  - `apps/api/app/observability.py::metrics_response` (imported)
- Called by: none resolved from repo symbols

### `metrics_middleware`
- Line: `93`
- Kind: `function`
- Calls:
  - `apps/api/app/observability.py::record_http_metrics` (imported)
- Called by: none resolved from repo symbols

### `root`
- Line: `142`
- Kind: `function`
- Routes: `GET /`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `security_middleware`
- Line: `61`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `unhandled_exception_handler`
- Line: `98`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/middleware/__init__.py`

## `apps/api/app/middleware/rate_limit.py`

Imported by:
- `apps/api/app/main.py`

### `RateLimitMiddleware.__init__`
- Line: `24`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `RateLimitMiddleware._get_client_ip`
- Line: `34`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/middleware/rate_limit.py::RateLimitMiddleware.dispatch` (self-method)

### `RateLimitMiddleware._is_rate_limited`
- Line: `40`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/middleware/rate_limit.py::RateLimitMiddleware.dispatch` (self-method)

### `RateLimitMiddleware.dispatch`
- Line: `60`
- Kind: `method`
- Calls:
  - `apps/api/app/middleware/rate_limit.py::RateLimitMiddleware._get_client_ip` (self-method)
  - `apps/api/app/middleware/rate_limit.py::RateLimitMiddleware._is_rate_limited` (self-method)
- Called by: none resolved from repo symbols

## `apps/api/app/models/__init__.py`

Imports from repo:
- `Base` -> `apps/api/app/database.py::Base` (symbol)
- `utcnow_naive` -> `apps/api/app/time_utils.py::utcnow_naive` (function)

Imported by:
- `apps/api/app/core/event_engine.py`
- `apps/api/app/core/rbac_engine.py`
- `apps/api/app/core/workflow_engine.py`
- `apps/api/app/database.py`
- `apps/api/app/routes/admin.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/api_keys.py`
- `apps/api/app/routes/applications.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/routes/auth.py`
- `apps/api/app/routes/events.py`
- `apps/api/app/routes/projects.py`
- `apps/api/app/routes/templates.py`
- `apps/api/app/routes/workflows.py`
- `apps/api/app/security.py`
- `apps/api/app/workflow.py`

### `generate_uuid`
- Line: `23`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/observability.py`

Imported by:
- `apps/api/app/ai/blueprint_generator.py`
- `apps/api/app/core/event_engine.py`
- `apps/api/app/core/workflow_engine.py`
- `apps/api/app/main.py`

### `metrics_response`
- Line: `51`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/main.py::metrics` (imported)

### `normalize_event_type`
- Line: `66`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (imported)

### `normalize_path`
- Line: `55`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/observability.py::record_http_metrics` (local)

### `record_http_metrics`
- Line: `73`
- Kind: `function`
- Calls:
  - `apps/api/app/observability.py::normalize_path` (local)
- Called by:
  - `apps/api/app/main.py::metrics_middleware` (imported)

## `apps/api/app/routes/__init__.py`

Imports from repo:
- `ai` -> `apps/api/app/routes/ai.py` (module)
- `applications` -> `apps/api/app/routes/applications.py` (module)
- `auth` -> `apps/api/app/routes/auth.py` (module)
- `events` -> `apps/api/app/routes/events.py` (module)
- `projects` -> `apps/api/app/routes/projects.py` (module)
- `workflows` -> `apps/api/app/routes/workflows.py` (module)

## `apps/api/app/routes/admin.py`

Imports from repo:
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `Application` -> `apps/api/app/models/__init__.py::Application` (class)
- `AuditLog` -> `apps/api/app/models/__init__.py::AuditLog` (symbol)
- `WorkflowTransition` -> `apps/api/app/models/__init__.py::WorkflowTransition` (symbol)
- `User` -> `apps/api/app/models/__init__.py::User` (class)
- `WorkflowInstance` -> `apps/api/app/models/__init__.py::WorkflowInstance` (symbol)
- `DashboardResponse` -> `apps/api/app/schemas/__init__.py::DashboardResponse` (symbol)
- `AuditLogEntry` -> `apps/api/app/schemas/__init__.py::AuditLogEntry` (symbol)
- `TransitionEntry` -> `apps/api/app/schemas/__init__.py::TransitionEntry` (symbol)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)

### `get_audit_log`
- Line: `61`
- Kind: `function`
- Routes: `GET /audit-log`
- Calls:
  - `apps/api/app/schemas/__init__.py::AuditLogEntry` (imported)
  - `apps/api/app/schemas/__init__.py::TransitionEntry` (imported)
- Called by: none resolved from repo symbols

### `get_dashboard`
- Line: `16`
- Kind: `function`
- Routes: `GET /dashboard`
- Calls:
  - `apps/api/app/schemas/__init__.py::DashboardResponse` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/ai.py`

Imports from repo:
- `BlueprintGenerator` -> `apps/api/app/ai/blueprint_generator.py::BlueprintGenerator` (class)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `EventEngine` -> `apps/api/app/core/event_engine.py::EventEngine` (class)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `BlueprintProposal` -> `apps/api/app/models/__init__.py::BlueprintProposal` (class)
- `Workflow` -> `apps/api/app/models/__init__.py::Workflow` (class)
- `BlueprintCompileRequest` -> `apps/api/app/schemas/__init__.py::BlueprintCompileRequest` (class)
- `BlueprintProposalResponse` -> `apps/api/app/schemas/__init__.py::BlueprintProposalResponse` (class)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)
- `utcnow_naive` -> `apps/api/app/time_utils.py::utcnow_naive` (function)
- `_now` -> `apps/api/app/time_utils.py::utcnow_naive` (function)

Imported by:
- `apps/api/app/main.py`
- `apps/api/app/routes/__init__.py`

### `compile_blueprint`
- Line: `21`
- Kind: `function`
- Routes: `POST /api/ai/blueprints/compile`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/models/__init__.py::BlueprintProposal` (imported)
- Called by: none resolved from repo symbols

### `deploy_blueprint`
- Line: `55`
- Kind: `function`
- Routes: `POST /api/ai/blueprints/{proposal_id}/deploy`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/models/__init__.py::Workflow` (imported)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (instance-method)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/api_keys.py`

Imports from repo:
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `APIKey` -> `apps/api/app/models/__init__.py::APIKey` (class)
- `APIKeyCreate` -> `apps/api/app/schemas/__init__.py::APIKeyCreate` (class)
- `APIKeyListResponse` -> `apps/api/app/schemas/__init__.py::APIKeyListResponse` (class)
- `APIKeyResponse` -> `apps/api/app/schemas/__init__.py::APIKeyResponse` (class)
- `APIKeyCreateResponse` -> `apps/api/app/schemas/__init__.py::APIKeyCreateResponse` (class)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)
- `utcnow_naive` -> `apps/api/app/time_utils.py::utcnow_naive` (function)

Imported by:
- `apps/api/app/main.py`

### `_generate_api_key`
- Line: `22`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/api_keys.py::create_api_key` (local)

### `create_api_key`
- Line: `50`
- Kind: `function`
- Routes: `POST /api/api-keys`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/routes/api_keys.py::_generate_api_key` (local)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/models/__init__.py::APIKey` (imported)
  - `apps/api/app/schemas/__init__.py::APIKeyCreateResponse` (imported)
- Called by: none resolved from repo symbols

### `list_api_keys`
- Line: `32`
- Kind: `function`
- Routes: `GET /api/api-keys`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

### `revoke_api_key`
- Line: `88`
- Kind: `function`
- Routes: `DELETE /api/api-keys/{key_id}`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/applications.py`

Imports from repo:
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `EventEngine` -> `apps/api/app/core/event_engine.py::EventEngine` (class)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `SchemaEngine` -> `apps/api/app/core/schema_engine.py::SchemaEngine` (class)
- `WorkflowEngine` -> `apps/api/app/core/workflow_engine.py::WorkflowEngine` (class)
- `WorkflowExecutionError` -> `apps/api/app/core/workflow_engine.py::WorkflowExecutionError` (class)
- `Application` -> `apps/api/app/models/__init__.py::Application` (class)
- `Workflow` -> `apps/api/app/models/__init__.py::Workflow` (class)
- `ApplicationCreate` -> `apps/api/app/schemas/__init__.py::ApplicationCreate` (class)
- `ApplicationResponse` -> `apps/api/app/schemas/__init__.py::ApplicationResponse` (class)
- `ApplicationTransition` -> `apps/api/app/schemas/__init__.py::ApplicationTransition` (class)
- `TenantContext` -> `apps/api/app/tenant.py::TenantContext` (class)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)

Imported by:
- `apps/api/app/main.py`
- `apps/api/app/routes/__init__.py`

### `create_application`
- Line: `19`
- Kind: `function`
- Routes: `POST /api/applications`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/core/schema_engine.py::SchemaEngine` (imported)
  - `apps/api/app/core/schema_engine.py::SchemaEngine.validate_application` (instance-method)
  - `apps/api/app/models/__init__.py::Application` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (instance-method)
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine` (imported)
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine.execute_until_wait` (instance-method)
- Called by: none resolved from repo symbols

### `list_applications`
- Line: `79`
- Kind: `function`
- Routes: `GET /api/applications`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

### `transition_application`
- Line: `97`
- Kind: `function`
- Routes: `POST /api/applications/{application_id}/transition`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (instance-method)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/architect.py`

Imports from repo:
- `ERP_COMPOSITION_SCHEMA` -> `apps/api/app/ai/architect/erp_schema.py::ERP_COMPOSITION_SCHEMA` (symbol)
- `ERP_SYSTEM_PROMPT` -> `apps/api/app/ai/architect/erp_schema.py::ERP_SYSTEM_PROMPT` (symbol)
- `NLPIntentParser` -> `apps/api/app/ai/architect/nlp_intent_parser.py::NLPIntentParser` (class)
- `ERPPromptFactory` -> `apps/api/app/ai/architect/prompt_factory.py::ERPPromptFactory` (class)
- `ERPVisualizationGenerator` -> `apps/api/app/ai/architect/visualization_generator.py::ERPVisualizationGenerator` (class)
- `get_provider_router` -> `apps/api/app/ai/provider_router.py::get_provider_router` (function)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `InstitutionArchitecture` -> `apps/api/app/models/__init__.py::InstitutionArchitecture` (class)
- `ArchitectureVersion` -> `apps/api/app/models/__init__.py::ArchitectureVersion` (class)
- `Workflow` -> `apps/api/app/models/__init__.py::Workflow` (class)
- `ArchitectureCreate` -> `apps/api/app/schemas/__init__.py::ArchitectureCreate` (class)
- `ArchitectureResponse` -> `apps/api/app/schemas/__init__.py::ArchitectureResponse` (class)
- `ArchitectureVersionResponse` -> `apps/api/app/schemas/__init__.py::ArchitectureVersionResponse` (class)
- `LinkWorkflowRequest` -> `apps/api/app/schemas/__init__.py::LinkWorkflowRequest` (class)
- `PromptRequest` -> `apps/api/app/schemas/__init__.py::PromptRequest` (class)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)
- `utcnow_naive` -> `apps/api/app/time_utils.py::utcnow_naive` (function)

Imported by:
- `apps/api/app/main.py`

### `_apply_operation`
- Line: `61`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/architect.py::apply_prompt` (local)
  - `apps/api/app/routes/architect.py::link_workflow` (local)

### `_compute_diff_summary`
- Line: `130`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/architect.py::apply_prompt` (local)

### `_get_arch_or_404`
- Line: `42`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/architect.py::get_architecture` (local)
  - `apps/api/app/routes/architect.py::apply_prompt` (local)
  - `apps/api/app/routes/architect.py::link_workflow` (local)
  - `apps/api/app/routes/architect.py::get_visualization` (local)
  - `apps/api/app/routes/architect.py::list_versions` (local)
  - `apps/api/app/routes/architect.py::available_workflows` (local)

### `_linked_workflows`
- Line: `52`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/architect.py::apply_prompt` (local)
  - `apps/api/app/routes/architect.py::link_workflow` (local)

### `apply_prompt`
- Line: `210`
- Kind: `function`
- Routes: `POST /api/architect/{arch_id}/prompt`
- Calls:
  - `apps/api/app/routes/architect.py::_get_arch_or_404` (local)
  - `apps/api/app/routes/architect.py::_linked_workflows` (local)
  - `apps/api/app/ai/provider_router.py::get_provider_router` (imported)
  - `apps/api/app/routes/architect.py::_apply_operation` (local)
  - `apps/api/app/routes/architect.py::_compute_diff_summary` (local)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/models/__init__.py::ArchitectureVersion` (imported)
  - `apps/api/app/routes/architect.py::_linked_workflows` (local)
- Called by: none resolved from repo symbols

### `available_workflows`
- Line: `394`
- Kind: `function`
- Routes: `GET /api/architect/{arch_id}/available-workflows`
- Calls:
  - `apps/api/app/routes/architect.py::_get_arch_or_404` (local)
- Called by: none resolved from repo symbols

### `create_architecture`
- Line: `153`
- Kind: `function`
- Routes: `POST /api/architect`
- Calls:
  - `apps/api/app/models/__init__.py::InstitutionArchitecture` (imported)
- Called by: none resolved from repo symbols

### `get_architecture`
- Line: `199`
- Kind: `function`
- Routes: `GET /api/architect/{arch_id}`
- Calls:
  - `apps/api/app/routes/architect.py::_get_arch_or_404` (local)
- Called by: none resolved from repo symbols

### `get_or_list_architectures`
- Line: `183`
- Kind: `function`
- Routes: `GET /api/architect`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `get_visualization`
- Line: `365`
- Kind: `function`
- Routes: `GET /api/architect/{arch_id}/visualization`
- Calls:
  - `apps/api/app/routes/architect.py::_get_arch_or_404` (local)
- Called by: none resolved from repo symbols

### `link_workflow`
- Line: `318`
- Kind: `function`
- Routes: `POST /api/architect/{arch_id}/link-workflow`
- Calls:
  - `apps/api/app/routes/architect.py::_get_arch_or_404` (local)
  - `apps/api/app/routes/architect.py::_apply_operation` (local)
  - `apps/api/app/time_utils.py::utcnow_naive` (imported)
  - `apps/api/app/routes/architect.py::_linked_workflows` (local)
- Called by: none resolved from repo symbols

### `list_versions`
- Line: `376`
- Kind: `function`
- Routes: `GET /api/architect/{arch_id}/versions`
- Calls:
  - `apps/api/app/routes/architect.py::_get_arch_or_404` (local)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/auth.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `User` -> `apps/api/app/models/__init__.py::User` (class)
- `LoginRequest` -> `apps/api/app/schemas/__init__.py::LoginRequest` (class)
- `RegisterRequest` -> `apps/api/app/schemas/__init__.py::RegisterRequest` (class)
- `TokenResponse` -> `apps/api/app/schemas/__init__.py::TokenResponse` (class)
- `UserResponse` -> `apps/api/app/schemas/__init__.py::UserResponse` (class)
- `create_access_token` -> `apps/api/app/security.py::create_access_token` (function)
- `create_refresh_token` -> `apps/api/app/security.py::create_refresh_token` (function)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)
- `hash_password` -> `apps/api/app/security.py::hash_password` (function)
- `verify_password` -> `apps/api/app/security.py::verify_password` (function)

Imported by:
- `apps/api/app/main.py`
- `apps/api/app/routes/__init__.py`

### `login`
- Line: `23`
- Kind: `function`
- Routes: `POST /api/auth/login`
- Calls:
  - `apps/api/app/security.py::verify_password` (imported)
  - `apps/api/app/security.py::create_access_token` (imported)
  - `apps/api/app/security.py::create_refresh_token` (imported)
  - `apps/api/app/schemas/__init__.py::TokenResponse` (imported)
- Called by: none resolved from repo symbols

### `me`
- Line: `82`
- Kind: `function`
- Routes: `GET /api/auth/me`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `register`
- Line: `47`
- Kind: `function`
- Routes: `POST /api/auth/register`
- Calls:
  - `apps/api/app/models/__init__.py::User` (imported)
  - `apps/api/app/security.py::hash_password` (imported)
  - `apps/api/app/security.py::create_access_token` (imported)
  - `apps/api/app/security.py::create_refresh_token` (imported)
  - `apps/api/app/schemas/__init__.py::TokenResponse` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/events.py`

Imports from repo:
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `Event` -> `apps/api/app/models/__init__.py::Event` (class)
- `EventResponse` -> `apps/api/app/schemas/__init__.py::EventResponse` (class)
- `TenantContext` -> `apps/api/app/tenant.py::TenantContext` (class)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)

Imported by:
- `apps/api/app/main.py`
- `apps/api/app/routes/__init__.py`

### `list_events`
- Line: `16`
- Kind: `function`
- Routes: `GET /api/events`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/projects.py`

Imports from repo:
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `Project` -> `apps/api/app/models/__init__.py::Project` (class)
- `ProjectCreate` -> `apps/api/app/schemas/__init__.py::ProjectCreate` (class)
- `ProjectResponse` -> `apps/api/app/schemas/__init__.py::ProjectResponse` (class)
- `TenantContext` -> `apps/api/app/tenant.py::TenantContext` (class)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)

Imported by:
- `apps/api/app/main.py`
- `apps/api/app/routes/__init__.py`

### `create_project`
- Line: `26`
- Kind: `function`
- Routes: `POST /api/projects`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/models/__init__.py::Project` (imported)
- Called by: none resolved from repo symbols

### `list_projects`
- Line: `16`
- Kind: `function`
- Routes: `GET /api/projects`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/routes/templates.py`

Imports from repo:
- `TemplateCustomizer` -> `apps/api/app/ai/template_customizer/__init__.py::TemplateCustomizer` (symbol)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `WorkflowTemplate` -> `apps/api/app/models/__init__.py::WorkflowTemplate` (class)
- `Workflow` -> `apps/api/app/models/__init__.py::Workflow` (class)
- `TemplateCustomization` -> `apps/api/app/models/__init__.py::TemplateCustomization` (class)
- `TemplateListResponse` -> `apps/api/app/schemas/__init__.py::TemplateListResponse` (class)
- `TemplateResponse` -> `apps/api/app/schemas/__init__.py::TemplateResponse` (class)
- `TemplateDetailResponse` -> `apps/api/app/schemas/__init__.py::TemplateDetailResponse` (class)
- `TemplateCustomizeRequest` -> `apps/api/app/schemas/__init__.py::TemplateCustomizeRequest` (class)
- `TemplateCustomizeResponse` -> `apps/api/app/schemas/__init__.py::TemplateCustomizeResponse` (class)
- `get_current_user` -> `apps/api/app/security.py::get_current_user` (function)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)

Imported by:
- `apps/api/app/main.py`

### `customize_template`
- Line: `51`
- Kind: `function`
- Routes: `POST /api/templates/{template_id}/customize`
- Calls:
  - `apps/api/app/models/__init__.py::TemplateCustomization` (imported)
  - `apps/api/app/schemas/__init__.py::TemplateCustomizeResponse` (imported)
- Called by: none resolved from repo symbols

### `deploy_template`
- Line: `91`
- Kind: `function`
- Routes: `POST /api/templates/{template_id}/deploy`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/models/__init__.py::Workflow` (imported)
- Called by: none resolved from repo symbols

### `get_template`
- Line: `39`
- Kind: `function`
- Routes: `GET /api/templates/{template_id}`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `list_templates`
- Line: `26`
- Kind: `function`
- Routes: `GET /api/templates`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/routes/workflows.py`

Imports from repo:
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `EventEngine` -> `apps/api/app/core/event_engine.py::EventEngine` (class)
- `check_permission` -> `apps/api/app/core/rbac_engine.py::check_permission` (function)
- `Workflow` -> `apps/api/app/models/__init__.py::Workflow` (class)
- `WorkflowCreate` -> `apps/api/app/schemas/__init__.py::WorkflowCreate` (class)
- `WorkflowResponse` -> `apps/api/app/schemas/__init__.py::WorkflowResponse` (class)
- `TenantContext` -> `apps/api/app/tenant.py::TenantContext` (class)
- `get_tenant_context` -> `apps/api/app/tenant.py::get_tenant_context` (function)

Imported by:
- `apps/api/app/main.py`
- `apps/api/app/routes/__init__.py`

### `create_workflow`
- Line: `38`
- Kind: `function`
- Routes: `POST /api/workflows`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/models/__init__.py::Workflow` (imported)
- Called by: none resolved from repo symbols

### `deploy_workflow`
- Line: `72`
- Kind: `function`
- Routes: `POST /api/workflows/{workflow_id}/deploy`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine` (imported)
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (instance-method)
- Called by: none resolved from repo symbols

### `list_workflows`
- Line: `20`
- Kind: `function`
- Routes: `GET /api/workflows`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

### `update_workflow`
- Line: `108`
- Kind: `function`
- Routes: `PUT /api/workflows/{workflow_id}`
- Calls:
  - `apps/api/app/core/rbac_engine.py::check_permission` (imported)
- Called by: none resolved from repo symbols

## `apps/api/app/schemas/__init__.py`

Imported by:
- `apps/api/app/routes/admin.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/api_keys.py`
- `apps/api/app/routes/applications.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/routes/auth.py`
- `apps/api/app/routes/events.py`
- `apps/api/app/routes/projects.py`
- `apps/api/app/routes/templates.py`
- `apps/api/app/routes/workflows.py`

## `apps/api/app/security.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)
- `get_db` -> `apps/api/app/database.py::get_db` (function)
- `User` -> `apps/api/app/models/__init__.py::User` (class)
- `utcnow` -> `apps/api/app/time_utils.py::utcnow` (function)

Imported by:
- `apps/api/app/core/rbac_engine.py`
- `apps/api/app/routes/admin.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/api_keys.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/routes/auth.py`
- `apps/api/app/routes/templates.py`

### `create_access_token`
- Line: `32`
- Kind: `function`
- Calls:
  - `apps/api/app/time_utils.py::utcnow` (imported)
- Called by:
  - `apps/api/app/routes/auth.py::login` (imported)
  - `apps/api/app/routes/auth.py::register` (imported)

### `create_refresh_token`
- Line: `45`
- Kind: `function`
- Calls:
  - `apps/api/app/time_utils.py::utcnow` (imported)
- Called by:
  - `apps/api/app/routes/auth.py::login` (imported)
  - `apps/api/app/routes/auth.py::register` (imported)

### `get_current_user`
- Line: `66`
- Kind: `function`
- Calls:
  - `apps/api/app/security.py::verify_token` (local)
- Called by: none resolved from repo symbols

### `hash_password`
- Line: `21`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/auth.py::register` (imported)

### `verify_password`
- Line: `25`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/routes/auth.py::login` (imported)

### `verify_token`
- Line: `56`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/security.py::get_current_user` (local)

## `apps/api/app/storage.py`

Imports from repo:
- `get_settings` -> `apps/api/app/config.py::get_settings` (function)

### `_get_supabase_client`
- Line: `22`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/storage.py::save_document` (local)
  - `apps/api/app/storage.py::get_signed_url` (local)

### `get_signed_url`
- Line: `56`
- Kind: `function`
- Calls:
  - `apps/api/app/storage.py::_get_supabase_client` (local)
- Called by: none resolved from repo symbols

### `save_document`
- Line: `30`
- Kind: `function`
- Calls:
  - `apps/api/app/storage.py::_get_supabase_client` (local)
- Called by: none resolved from repo symbols

## `apps/api/app/templates/__init__.py`

Imports from repo:
- `TEMPLATE_REGISTRY` -> `apps/api/app/templates/registry.py::TEMPLATE_REGISTRY` (symbol)
- `load_template` -> `apps/api/app/templates/loader.py::load_template` (function)

## `apps/api/app/templates/loader.py`

Imports from repo:
- `TEMPLATE_REGISTRY` -> `apps/api/app/templates/registry.py::TEMPLATE_REGISTRY` (symbol)

Imported by:
- `apps/api/app/templates/__init__.py`

### `_templates_dir`
- Line: `10`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/templates/loader.py::load_template` (local)

### `load_template`
- Line: `16`
- Kind: `function`
- Calls:
  - `apps/api/app/templates/loader.py::_templates_dir` (local)
- Called by: none resolved from repo symbols

## `apps/api/app/templates/registry.py`

Imported by:
- `apps/api/app/templates/__init__.py`
- `apps/api/app/templates/loader.py`

## `apps/api/app/tenant.py`

Imported by:
- `apps/api/app/core/rbac_engine.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/applications.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/routes/events.py`
- `apps/api/app/routes/projects.py`
- `apps/api/app/routes/templates.py`
- `apps/api/app/routes/workflows.py`

### `get_tenant_context`
- Line: `14`
- Kind: `function`
- Calls:
  - `apps/api/app/tenant.py::TenantContext` (local-class)
- Called by: none resolved from repo symbols

## `apps/api/app/time_utils.py`

Imported by:
- `apps/api/app/core/event_engine.py`
- `apps/api/app/core/workflow_engine.py`
- `apps/api/app/models/__init__.py`
- `apps/api/app/routes/ai.py`
- `apps/api/app/routes/api_keys.py`
- `apps/api/app/routes/architect.py`
- `apps/api/app/security.py`

### `utcnow`
- Line: `6`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/security.py::create_access_token` (imported)
  - `apps/api/app/security.py::create_refresh_token` (imported)

### `utcnow_naive`
- Line: `10`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/core/event_engine.py::EventEngine.emit` (imported)
  - `apps/api/app/core/workflow_engine.py::WorkflowEngine.execute_until_wait` (imported)
  - `apps/api/app/routes/ai.py::deploy_blueprint` (imported)
  - `apps/api/app/routes/api_keys.py::create_api_key` (imported)
  - `apps/api/app/routes/architect.py::apply_prompt` (imported)
  - `apps/api/app/routes/architect.py::link_workflow` (imported)

## `apps/api/app/utils.py`

### `safe_json_dumps`
- Line: `15`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `safe_json_loads`
- Line: `6`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/workflow.py`

Imports from repo:
- `WorkflowDefinition` -> `apps/api/app/models/__init__.py::WorkflowDefinition` (symbol)
- `WorkflowInstance` -> `apps/api/app/models/__init__.py::WorkflowInstance` (symbol)
- `WorkflowTransition` -> `apps/api/app/models/__init__.py::WorkflowTransition` (symbol)
- `Application` -> `apps/api/app/models/__init__.py::Application` (class)
- `AuditLog` -> `apps/api/app/models/__init__.py::AuditLog` (symbol)

### `WorkflowEngine.__init__`
- Line: `53`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `WorkflowEngine._find_initial_state`
- Line: `56`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/workflow.py::WorkflowEngine.start_workflow` (self-method)

### `WorkflowEngine._process_automatic_transitions`
- Line: `152`
- Kind: `method`
- Calls:
  - `apps/api/app/workflow.py::WorkflowEngine.transition` (self-method)
- Called by:
  - `apps/api/app/workflow.py::WorkflowEngine.start_workflow` (self-method)

### `WorkflowEngine.start_workflow`
- Line: `62`
- Kind: `method`
- Calls:
  - `apps/api/app/workflow.py::WorkflowEngine._find_initial_state` (self-method)
  - `apps/api/app/models/__init__.py::WorkflowInstance` (imported)
  - `apps/api/app/workflow.py::WorkflowEngine._process_automatic_transitions` (self-method)
- Called by: none resolved from repo symbols

### `WorkflowEngine.transition`
- Line: `99`
- Kind: `method`
- Calls:
  - `apps/api/app/models/__init__.py::WorkflowTransition` (imported)
  - `apps/api/app/models/__init__.py::AuditLog` (imported)
- Called by:
  - `apps/api/app/workflow.py::WorkflowEngine._process_automatic_transitions` (self-method)

### `evaluate_condition`
- Line: `18`
- Kind: `function`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

## `apps/api/app/ws.py`

Imported by:
- `apps/api/app/core/event_engine.py`
- `apps/api/app/main.py`

### `WebSocketHub.__init__`
- Line: `10`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by: none resolved from repo symbols

### `WebSocketHub._channel`
- Line: `14`
- Kind: `method`
- Calls: none resolved to repo symbols
- Called by:
  - `apps/api/app/ws.py::WebSocketHub.connect` (self-method)
  - `apps/api/app/ws.py::WebSocketHub.disconnect` (self-method)
  - `apps/api/app/ws.py::WebSocketHub.broadcast` (self-method)

### `WebSocketHub.broadcast`
- Line: `26`
- Kind: `method`
- Calls:
  - `apps/api/app/ws.py::WebSocketHub._channel` (self-method)
- Called by: none resolved from repo symbols

### `WebSocketHub.connect`
- Line: `17`
- Kind: `method`
- Calls:
  - `apps/api/app/ws.py::WebSocketHub._channel` (self-method)
- Called by: none resolved from repo symbols

### `WebSocketHub.disconnect`
- Line: `21`
- Kind: `method`
- Calls:
  - `apps/api/app/ws.py::WebSocketHub._channel` (self-method)
- Called by: none resolved from repo symbols
