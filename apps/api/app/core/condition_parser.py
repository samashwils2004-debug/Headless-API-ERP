"""Safe condition parser and evaluator (no eval, no nested expressions beyond one logical level)."""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

ALLOWED_LOGICAL = {"and", "or"}
ALLOWED_OPERATORS = {"<", ">", "<=", ">=", "==", "!="}
TOKEN_RE = re.compile(r"\s*(<=|>=|==|!=|<|>|\(|\)|and\b|or\b|true\b|false\b|[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|'[^']*'|\"[^\"]*\")\s*")
IDENT_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_]*$")


class ConditionParseError(ValueError):
    pass


@dataclass(frozen=True)
class Comparison:
    field: str
    operator: str
    value: Any


@dataclass(frozen=True)
class Logical:
    left: Comparison
    op: str
    right: Comparison


class ConditionParser:
    def tokenize(self, text: str) -> list[str]:
        tokens: list[str] = []
        i = 0
        while i < len(text):
            match = TOKEN_RE.match(text, i)
            if not match:
                raise ConditionParseError(f"Invalid token near: {text[i:i+15]}")
            token = match.group(1)
            tokens.append(token)
            i = match.end()

        if "(" in tokens or ")" in tokens:
            raise ConditionParseError("Parentheses are forbidden")
        return tokens

    def parse(self, text: str) -> Comparison | Logical:
        text = (text or "").strip()
        if not text:
            raise ConditionParseError("Empty condition")
        tokens = self.tokenize(text)

        logical_idx = [idx for idx, token in enumerate(tokens) if token in ALLOWED_LOGICAL]
        if len(logical_idx) > 1:
            raise ConditionParseError("Nested or chained logical expressions are forbidden")

        if len(logical_idx) == 1:
            idx = logical_idx[0]
            left = self._parse_comparison(tokens[:idx])
            right = self._parse_comparison(tokens[idx + 1 :])
            return Logical(left=left, op=tokens[idx], right=right)

        return self._parse_comparison(tokens)

    def _parse_comparison(self, tokens: list[str]) -> Comparison:
        if len(tokens) != 3:
            raise ConditionParseError("Comparison must be: field operator value")
        field, operator, raw_value = tokens
        if not IDENT_RE.match(field):
            raise ConditionParseError("Invalid field identifier")
        if "." in field or "[" in field or "]" in field:
            raise ConditionParseError("Dynamic property access is forbidden")
        if operator not in ALLOWED_OPERATORS:
            raise ConditionParseError("Invalid operator")
        return Comparison(field=field, operator=operator, value=self._parse_value(raw_value))

    @staticmethod
    def _parse_value(token: str) -> Any:
        if token in {"true", "false"}:
            return token == "true"
        if token.startswith("'") and token.endswith("'"):
            return token[1:-1]
        if token.startswith('"') and token.endswith('"'):
            return token[1:-1]
        if re.fullmatch(r"\d+", token):
            return int(token)
        if re.fullmatch(r"\d+\.\d+", token):
            return float(token)
        raise ConditionParseError("Only scalar literals are allowed")


def evaluate_condition(condition: str, context: dict[str, Any]) -> bool:
    parser = ConditionParser()
    expression = parser.parse(condition)

    def run(comp: Comparison) -> bool:
        left = context.get(comp.field)
        if left is None:
            return False
        right = comp.value
        op = comp.operator
        if op == "<":
            return left < right
        if op == ">":
            return left > right
        if op == "<=":
            return left <= right
        if op == ">=":
            return left >= right
        if op == "==":
            return left == right
        if op == "!=":
            return left != right
        return False

    if isinstance(expression, Logical):
        left_val = run(expression.left)
        right_val = run(expression.right)
        return (left_val and right_val) if expression.op == "and" else (left_val or right_val)

    return run(expression)

