"""Token-efficient prompt builder for Mode B ERP Architect AI."""
from __future__ import annotations


class ERPPromptFactory:
    """
    Builds a compact prompt from the current graph state.
    Sends domain names + module labels only — NOT the full graph JSON.
    This saves ~70% of tokens on average calls.
    """

    def build(self, user_prompt: str, current_graph: dict) -> str:
        system = current_graph.get("erp_system", {})
        domains = system.get("domains", [])
        integrations = system.get("integrations", [])

        domain_lines: list[str] = []
        for d in domains:
            modules_str = ""
            if d.get("modules"):
                labels = ", ".join(m.get("label", m.get("id", "?")) for m in d["modules"])
                modules_str = f" (modules: {labels})"
            workflow_str = ""
            if d.get("workflow_id"):
                workflow_str = f" [LINKED: {d.get('workflow_name', d['workflow_id'])}]"
            domain_lines.append(f"  - {d['id']}: {d.get('label', d['id'])}{modules_str}{workflow_str}")

        integration_lines: list[str] = []
        for i in integrations:
            event = i.get("trigger_event") or i.get("event", "?")
            integration_lines.append(
                f"  - {i.get('from', '?')} → {i.get('to', '?')} (on: {event})"
            )

        domain_section = "\n".join(domain_lines) if domain_lines else "  (none yet)"
        integration_section = "\n".join(integration_lines) if integration_lines else "  (none yet)"

        # Cap prompt at 500 chars to save tokens
        safe_prompt = user_prompt[:500]

        return (
            f"Current ERP:\n"
            f"Domains:\n{domain_section}\n\n"
            f"Integrations:\n{integration_section}\n\n"
            f"User: {safe_prompt}"
        )
