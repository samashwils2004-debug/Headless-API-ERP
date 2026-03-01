from __future__ import annotations

from collections import deque
from typing import Any


def analyze_graph(blueprint: dict[str, Any]) -> list[str]:
    graph_errors: list[str] = []
    workflow = blueprint.get("workflow", {})
    states = workflow.get("states", {})
    initial = workflow.get("initial_state")

    if initial not in states:
        graph_errors.append("initial_state is missing from states")
    if states:
        visited: set[str] = set()
        queue = deque([initial]) if initial else deque()
        while queue:
            node = queue.popleft()
            if node in visited or node not in states:
                continue
            visited.add(node)
            for transition in states[node].get("transitions", []):
                nxt = transition.get("to")
                if nxt not in states:
                    graph_errors.append(f"undefined transition target: {nxt}")
                else:
                    queue.append(nxt)

        unreachable = set(states.keys()) - visited
        if unreachable:
            graph_errors.append(f"unreachable states: {sorted(unreachable)}")

        def has_cycle() -> bool:
            temp: set[str] = set()
            perm: set[str] = set()

            def visit(node: str) -> bool:
                if node in perm:
                    return False
                if node in temp:
                    return True
                temp.add(node)
                for transition in states.get(node, {}).get("transitions", []):
                    target = transition.get("to")
                    if target in states and visit(target):
                        return True
                temp.remove(node)
                perm.add(node)
                return False

            return any(visit(node) for node in states)

        if has_cycle():
            graph_errors.append("graph contains cycle")

        if not any(len(config.get("transitions", [])) == 0 for config in states.values()):
            graph_errors.append("no terminal state detected")

    return graph_errors
