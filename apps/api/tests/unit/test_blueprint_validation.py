from app.ai.blueprint_generator import BlueprintGenerator


def _compiler_without_openai():
    compiler = BlueprintGenerator()
    return compiler


def test_graph_validation_detects_cycle_and_missing_terminal():
    compiler = _compiler_without_openai()
    blueprint = {
        "workflow": {
            "name": "bad-graph",
            "initial_state": "a",
            "states": {
                "a": {"transitions": [{"to": "b"}]},
                "b": {"transitions": [{"to": "a"}]},
            },
        },
        "roles": [{"name": "owner", "permissions": ["workflow:read"]}],
        "events": [{"type": "workflow.transitioned", "version": "1.0"}],
        "compliance_tags": ["ferpa"],
    }
    result = compiler.validate(blueprint)
    assert result["stage_2_graph_integrity"]["valid"] is False
    assert any("cycle" in err for err in result["stage_2_graph_integrity"]["errors"])


def test_permission_validation_detects_escalation():
    compiler = _compiler_without_openai()
    blueprint = {
        "workflow": {
            "name": "ok",
            "initial_state": "start",
            "states": {
                "start": {"transitions": [{"to": "done"}]},
                "done": {"transitions": []},
            },
        },
        "roles": [{"name": "operator", "permissions": ["workflow:deploy"]}],
        "events": [{"type": "workflow.transitioned", "version": "1.0"}],
        "compliance_tags": ["ferpa"],
    }
    result = compiler.validate(blueprint)
    assert result["stage_3_permission_analysis"]["valid"] is False

