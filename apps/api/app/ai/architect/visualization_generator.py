"""
Deterministic visualization generator for Mode B.
No AI call — pure transform: graph + linked workflows → visualization config.
Called after every graph change or workflow link.
"""
from __future__ import annotations

from datetime import datetime


# Preset styles per domain id (fallback to 'default')
_DOMAIN_STYLES: dict[str, dict] = {
    "admissions":  {"color": "#3b82f6", "charts": ["chart_line", "chart_donut"],   "widgets": ["calendar", "activity_feed"]},
    "finance":     {"color": "#10b981", "charts": ["chart_bar", "chart_line"],      "widgets": ["table"]},
    "hr":          {"color": "#f59e0b", "charts": ["chart_donut"],                  "widgets": ["activity_feed", "calendar"]},
    "scholarship": {"color": "#8b5cf6", "charts": ["chart_bar"],                    "widgets": ["table"]},
    "academics":   {"color": "#6366f1", "charts": ["chart_line"],                   "widgets": ["calendar", "table"]},
    "student":     {"color": "#ec4899", "charts": ["chart_donut", "chart_bar"],     "widgets": ["activity_feed"]},
    "research":    {"color": "#14b8a6", "charts": ["chart_line"],                   "widgets": ["table", "calendar"]},
    "default":     {"color": "#6b7280", "charts": ["chart_bar"],                    "widgets": ["activity_feed"]},
}


class ERPVisualizationGenerator:
    """
    Transforms a domain graph + linked workflow list into a rich
    visualization config that the frontend renders as an ERP dashboard.

    This is intentionally pure and has zero side effects.
    """

    def generate(self, graph: dict, linked_workflows: list[dict]) -> dict:
        """
        Args:
            graph: The current erp_system domain graph JSON.
            linked_workflows: List of { domain_id, workflow_id, workflow_name }.
        Returns:
            Visualization config dict stored in institution_architectures.visualization_config.
        """
        system = graph.get("erp_system", {})
        domains = system.get("domains", [])
        integrations = system.get("integrations", [])
        linked_map = {lw["domain_id"]: lw for lw in linked_workflows}

        sections: list[dict] = []
        for d in domains:
            style = _DOMAIN_STYLES.get(d["id"], _DOMAIN_STYLES["default"])
            linked = linked_map.get(d["id"])
            color = d.get("color") or style["color"]

            sections.append({
                "domain_id": d["id"],
                "label": d.get("label", d["id"].replace("_", " ").title()),
                "color": color,
                "icon": d.get("icon", "cube"),
                "status": "live" if linked else "unlinked",
                "workflow_id": linked["workflow_id"] if linked else None,
                "workflow_name": linked.get("workflow_name") if linked else None,
                "layout": {
                    "primary_metric": {
                        "type": "stat_counter",
                        "label": f"Total {d.get('label', d['id'])}",
                        "value": "—",
                        "trend": None,
                    },
                    "charts": [
                        {"type": c, "label": f"{d.get('label', d['id'])} Over Time", "data": None}
                        for c in style["charts"]
                    ],
                    "widgets": style["widgets"],
                    "modules": [
                        {
                            "id": m["id"],
                            "label": m.get("label", m["id"]),
                            "visualization": m.get("visualization_hint", "card"),
                            "value": None,
                        }
                        for m in d.get("modules", [])
                    ],
                },
            })

        n = len(sections)
        if n <= 2:
            layout_mode = "two_column"
        elif n <= 4:
            layout_mode = "four_grid"
        else:
            layout_mode = "masonry"

        return {
            "system_name": system.get("name", "Institutional ERP"),
            "sections": sections,
            "integrations": [
                {
                    "from": i.get("from", ""),
                    "to": i.get("to", ""),
                    "event": i.get("trigger_event") or i.get("event", ""),
                    "label": i.get("description", ""),
                }
                for i in integrations
            ],
            "layout_mode": layout_mode,
            "generated_at": datetime.utcnow().isoformat(),
        }
