"""NLP intent classifier for the Architect page — no AI call required."""
from __future__ import annotations

import re
from dataclasses import dataclass, field


@dataclass
class ParsedIntent:
    type: str
    confidence: float = 1.0
    message: str = ""
    pre_fill_prompt: str = ""
    suggested_action: str = ""


# Keyword patterns per intent (regex patterns, most specific first)
_KEYWORD_SETS: dict[str, list[str]] = {
    "redirect_to_workflow": [
        r"create a workflow",
        r"generate workflow",
        r"build workflow",
        r"make a workflow",
        r"i need a workflow",
        r"workflow that ",
        r"workflow which ",
    ],
    "compile": [
        r"compile",
        r"issue api key",
        r"issue a key",
        r"create key",
        r"make it live",
        r"versioned key",
        r"deploy architecture",
    ],
    "link_workflow": [
        r"link the workflow",
        r"attach workflow",
        r"use workflow",
        r"connect the .+ workflow",
        r"link it to",
        r"use the one i just",
    ],
    "link_template": [
        r"use template",
        r"use the template",
        r"apply template",
        r"use .+ template",
    ],
    "visualize": [
        r"show me",
        r"preview",
        r"render",
        r"what does this look like",
        r"show dashboard",
        r"display",
        r"what have i built",
    ],
    "connect_domains": [
        r"connect",
        r"link domain",
        r"when .+ trigger",
        r"after .+ then",
        r"integrate with",
        r"pipe to",
        r"flows to",
        r"triggers",
    ],
    "compose_domain": [
        r"add domain",
        r"add a ",
        r"create domain",
        r"new domain",
        r"include ",
        r"add module",
        r"add section",
        r"build section",
        r"i want",
        r"add ",
    ],
}

# Weights: longer patterns are more specific, get a slight boost
_BASE_SCORE = 0.5
_LENGTH_WEIGHT = 0.1


class NLPIntentParser:
    """
    Lightweight keyword-based intent classifier.
    Keeps AI quota for actual composition calls, not routing decisions.
    """

    def parse(self, prompt: str) -> ParsedIntent:
        prompt_lower = prompt.lower().strip()
        scores: dict[str, float] = {}

        for intent, patterns in _KEYWORD_SETS.items():
            score = 0.0
            for pattern in patterns:
                if re.search(pattern, prompt_lower):
                    score += _BASE_SCORE + len(pattern.split()) * _LENGTH_WEIGHT
            scores[intent] = score

        best = max(scores, key=lambda k: scores[k])
        raw_best_score = scores[best]
        # Normalise to 0–1
        confidence = min(raw_best_score / 2.0, 1.0)

        # When ambiguous, default to AI composition (most common action)
        if confidence < 0.2:
            best = "compose_domain"
            confidence = 0.2

        if best == "redirect_to_workflow":
            return ParsedIntent(
                type="redirect_to_workflow",
                confidence=confidence,
                message="Workflow creation happens on the Workflows page.",
                suggested_action="open_workflow_creator",
                pre_fill_prompt=prompt,
            )

        return ParsedIntent(type=best, confidence=confidence)
