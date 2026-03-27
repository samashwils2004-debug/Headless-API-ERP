from __future__ import annotations

import ast
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "apps" / "api"
BACKEND_APP_ROOT = BACKEND_ROOT / "app"
FRONTEND_ROOT = REPO_ROOT / "apps" / "web"
FRONTEND_SRC_ROOT = FRONTEND_ROOT / "src"
OUTPUT_ROOT = REPO_ROOT / "docs" / "repo-connectivity"

HTTP_METHODS = {"get", "post", "put", "patch", "delete", "options"}
TS_SUFFIXES = (".ts", ".tsx")


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def ensure_output_dir() -> None:
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig")


def normalize_dynamic_path(value: str) -> str:
    value = value.replace("\\", "/")
    if "/api/" in value and not value.startswith("/api/"):
        value = value[value.index("/api/") :]
    value = re.sub(r"\$\{([^}]+)\}", lambda match: "{" + match.group(1).split(".")[-1] + "}", value)
    value = re.sub(r"\[([^\]]+)\]", r"{\1}", value)
    value = re.sub(r"\?.*$", "", value)
    value = re.sub(r"\{(?:query|search)\}$", "", value)
    return value


def endpoint_key(method: str, path: str) -> str:
    return f"{method.upper()} {normalize_dynamic_path(path)}"


def canonical_path(path: str) -> str:
    return re.sub(r"\{[^}]+\}", "{param}", normalize_dynamic_path(path))


def canonical_endpoint_key(method: str, path: str) -> str:
    return f"{method.upper()} {canonical_path(path)}"


def list_backend_files() -> list[Path]:
    return sorted(path for path in BACKEND_APP_ROOT.rglob("*.py"))


def list_frontend_files() -> list[Path]:
    files = sorted(path for path in FRONTEND_SRC_ROOT.rglob("*") if path.suffix in TS_SUFFIXES)
    middleware = FRONTEND_ROOT / "middleware.ts"
    if middleware.exists():
        files.append(middleware)
    return sorted(set(files))


def python_module_for_file(path: Path) -> str:
    relative = path.relative_to(BACKEND_ROOT).with_suffix("")
    return ".".join(relative.parts)


def current_package_segments_for_file(path: Path) -> list[str]:
    return python_module_for_file(path).split(".")[:-1]


def module_to_backend_file(module_name: str) -> Path | None:
    if not module_name.startswith("app"):
        return None
    parts = module_name.split(".")
    direct = BACKEND_ROOT.joinpath(*parts).with_suffix(".py")
    if direct.exists():
        return direct
    package_init = BACKEND_ROOT.joinpath(*parts, "__init__.py")
    if package_init.exists():
        return package_init
    return None


def resolve_python_import_module(node: ast.ImportFrom, current_file: Path) -> str | None:
    module = node.module or ""
    if node.level == 0:
        return module or None

    package_segments = current_package_segments_for_file(current_file)
    keep = len(package_segments) - (node.level - 1)
    if keep < 0:
        keep = 0
    base_segments = package_segments[:keep]
    if module:
        base_segments += module.split(".")
    return ".".join(base_segments) or None


@dataclass
class ImportTarget:
    alias: str
    kind: str
    file: str
    symbol: str | None = None
    source: str | None = None


@dataclass
class RouteInfo:
    method: str
    path: str

    def as_dict(self) -> dict[str, str]:
        return {"method": self.method, "path": self.path}


@dataclass
class BackendFunctionInfo:
    symbol: str
    kind: str
    line: int
    class_name: str | None = None
    routes: list[RouteInfo] = field(default_factory=list)
    calls: list[dict[str, Any]] = field(default_factory=list)
    called_by: list[dict[str, Any]] = field(default_factory=list)


@dataclass
class BackendFileInfo:
    module: str
    functions: dict[str, BackendFunctionInfo] = field(default_factory=dict)
    classes: dict[str, dict[str, Any]] = field(default_factory=dict)
    imports: list[dict[str, Any]] = field(default_factory=list)
    imported_by: list[str] = field(default_factory=list)
    file_calls: list[dict[str, Any]] = field(default_factory=list)
    route_prefix: str | None = None


def literal_string(node: ast.AST) -> str | None:
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    return None


def combine_path(prefix: str | None, suffix: str) -> str:
    prefix = prefix or ""
    full = f"{prefix.rstrip('/')}/{suffix.lstrip('/')}" if suffix else prefix
    return full if full.startswith("/") else f"/{full}"


def dedupe_dict_list(items: list[dict[str, Any]], keys: tuple[str, ...]) -> list[dict[str, Any]]:
    seen: set[tuple[Any, ...]] = set()
    output: list[dict[str, Any]] = []
    for item in items:
        marker = tuple(item.get(key) for key in keys)
        if marker in seen:
            continue
        seen.add(marker)
        output.append(item)
    return output


def parse_main_router_prefixes() -> dict[str, str]:
    main_path = BACKEND_APP_ROOT / "main.py"
    tree = ast.parse(read_text(main_path), filename=str(main_path))
    route_aliases: dict[str, str] = {}
    for node in tree.body:
        if isinstance(node, ast.ImportFrom) and node.module == "app.routes":
            for alias in node.names:
                route_aliases[alias.asname or alias.name] = alias.name

    prefixes: dict[str, str] = {}
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not isinstance(node.func, ast.Attribute):
            continue
        if not isinstance(node.func.value, ast.Name) or node.func.value.id != "app":
            continue
        if node.func.attr != "include_router" or not node.args:
            continue
        router_arg = node.args[0]
        if not isinstance(router_arg, ast.Attribute):
            continue
        if not isinstance(router_arg.value, ast.Name):
            continue
        alias = router_arg.value.id
        route_name = route_aliases.get(alias)
        if not route_name:
            continue
        prefix = ""
        for keyword in node.keywords:
            if keyword.arg == "prefix":
                prefix = literal_string(keyword.value) or ""
        prefixes[route_name] = prefix
    return prefixes


def extract_backend_routes(node: ast.FunctionDef | ast.AsyncFunctionDef, prefix: str | None) -> list[RouteInfo]:
    routes: list[RouteInfo] = []
    for decorator in node.decorator_list:
        if not isinstance(decorator, ast.Call):
            continue
        if not isinstance(decorator.func, ast.Attribute):
            continue
        if not isinstance(decorator.func.value, ast.Name):
            continue
        owner = decorator.func.value.id
        if owner not in {"router", "app"}:
            continue
        if owner == "router" and decorator.func.attr not in HTTP_METHODS:
            continue
        if owner == "app" and decorator.func.attr not in HTTP_METHODS | {"websocket"}:
            continue
        method = decorator.func.attr.upper()
        path = "/"
        if decorator.args:
            path = literal_string(decorator.args[0]) or "/"
        effective_prefix = prefix if owner == "router" else None
        routes.append(RouteInfo(method=method, path=combine_path(effective_prefix, path)))
    return routes


def build_backend_symbol_table() -> dict[str, BackendFileInfo]:
    route_prefixes = parse_main_router_prefixes()
    files: dict[str, BackendFileInfo] = {}
    for path in list_backend_files():
        module = python_module_for_file(path)
        info = BackendFileInfo(module=module)
        file_key = rel(path)

        if path.parent.name == "routes":
            info.route_prefix = route_prefixes.get(path.stem)

        tree = ast.parse(read_text(path), filename=str(path))
        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                symbol = node.name
                function_info = BackendFunctionInfo(symbol=symbol, kind="function", line=node.lineno)
                function_info.routes.extend(extract_backend_routes(node, info.route_prefix))
                info.functions[symbol] = function_info
            elif isinstance(node, ast.ClassDef):
                methods: dict[str, int] = {}
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        symbol = f"{node.name}.{item.name}"
                        info.functions[symbol] = BackendFunctionInfo(
                            symbol=symbol,
                            kind="method",
                            line=item.lineno,
                            class_name=node.name,
                        )
                        methods[item.name] = item.lineno
                info.classes[node.name] = {"methods": methods, "line": node.lineno}
        files[file_key] = info
    return files


def resolve_python_imports(
    path: Path,
    backend_symbols: dict[str, BackendFileInfo],
) -> tuple[dict[str, ImportTarget], list[dict[str, Any]]]:
    tree = ast.parse(read_text(path), filename=str(path))
    alias_map: dict[str, ImportTarget] = {}
    imports: list[dict[str, Any]] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                module_name = alias.name
                target_file = module_to_backend_file(module_name)
                if not target_file:
                    continue
                alias_name = alias.asname or module_name.split(".")[-1]
                target = ImportTarget(alias=alias_name, kind="module", file=rel(target_file), source=module_name)
                alias_map[alias_name] = target
                imports.append(target.__dict__)
        elif isinstance(node, ast.ImportFrom):
            base_module = resolve_python_import_module(node, path)
            if not base_module:
                continue
            base_file = module_to_backend_file(base_module)
            for alias in node.names:
                if alias.name == "*":
                    continue
                alias_name = alias.asname or alias.name
                module_candidate = f"{base_module}.{alias.name}"
                module_file = module_to_backend_file(module_candidate)
                if module_file:
                    target = ImportTarget(
                        alias=alias_name,
                        kind="module",
                        file=rel(module_file),
                        source=module_candidate,
                    )
                    alias_map[alias_name] = target
                    imports.append(target.__dict__)
                    continue
                if not base_file:
                    continue
                file_key = rel(base_file)
                symbol_kind = "symbol"
                backend_file_info = backend_symbols.get(file_key)
                if backend_file_info:
                    if alias.name in backend_file_info.functions:
                        symbol_kind = "function"
                    elif alias.name in backend_file_info.classes:
                        symbol_kind = "class"
                target = ImportTarget(
                    alias=alias_name,
                    kind=symbol_kind,
                    file=file_key,
                    symbol=alias.name,
                    source=base_module,
                )
                alias_map[alias_name] = target
                imports.append(target.__dict__)
    return alias_map, dedupe_dict_list(imports, ("alias", "file", "symbol", "kind"))


def assigned_names(targets: list[ast.expr]) -> list[str]:
    names: list[str] = []
    for target in targets:
        if isinstance(target, ast.Name):
            names.append(target.id)
        elif isinstance(target, (ast.Tuple, ast.List)):
            names.extend(assigned_names(list(target.elts)))
    return names


class BackendFunctionCallAnalyzer(ast.NodeVisitor):
    def __init__(
        self,
        current_file: str,
        current_function: BackendFunctionInfo,
        alias_map: dict[str, ImportTarget],
        local_symbols: set[str],
        classes: dict[str, dict[str, Any]],
    ) -> None:
        self.current_file = current_file
        self.current_function = current_function
        self.alias_map = alias_map
        self.local_symbols = local_symbols
        self.classes = classes
        self.current_class = current_function.class_name
        self.instance_types: dict[str, dict[str, str]] = {}

    def resolve_call(self, func: ast.AST) -> dict[str, Any] | None:
        if isinstance(func, ast.Name):
            name = func.id
            if name in self.alias_map:
                target = self.alias_map[name]
                if target.kind == "module":
                    return None
                return {"target_file": target.file, "target_symbol": target.symbol or name, "kind": "imported"}
            if name in self.local_symbols:
                return {"target_file": self.current_file, "target_symbol": name, "kind": "local"}
            if name in self.classes:
                return {"target_file": self.current_file, "target_symbol": name, "kind": "local-class"}
            return None

        if isinstance(func, ast.Attribute) and isinstance(func.value, ast.Name):
            owner = func.value.id
            if owner in self.alias_map and self.alias_map[owner].kind == "module":
                target = self.alias_map[owner]
                return {"target_file": target.file, "target_symbol": func.attr, "kind": "module-attr"}
            if owner in self.instance_types:
                target = self.instance_types[owner]
                return {
                    "target_file": target["file"],
                    "target_symbol": f"{target['class_name']}.{func.attr}",
                    "kind": "instance-method",
                }
            if owner == "self" and self.current_class:
                return {
                    "target_file": self.current_file,
                    "target_symbol": f"{self.current_class}.{func.attr}",
                    "kind": "self-method",
                }
        return None

    def visit_Assign(self, node: ast.Assign) -> Any:
        if isinstance(node.value, ast.Call):
            resolved = self.resolve_call(node.value.func)
            is_constructor = False
            if isinstance(node.value.func, ast.Name):
                call_name = node.value.func.id
                is_constructor = call_name in self.classes or (
                    call_name in self.alias_map and self.alias_map[call_name].kind == "class"
                )
            if resolved and is_constructor:
                class_name = resolved["target_symbol"].split(".")[0]
                for name in assigned_names(node.targets):
                    self.instance_types[name] = {"file": resolved["target_file"], "class_name": class_name}
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> Any:
        if isinstance(node.target, ast.Name) and isinstance(node.value, ast.Call):
            resolved = self.resolve_call(node.value.func)
            is_constructor = False
            if isinstance(node.value.func, ast.Name):
                call_name = node.value.func.id
                is_constructor = call_name in self.classes or (
                    call_name in self.alias_map and self.alias_map[call_name].kind == "class"
                )
            if resolved and is_constructor:
                class_name = resolved["target_symbol"].split(".")[0]
                self.instance_types[node.target.id] = {"file": resolved["target_file"], "class_name": class_name}
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call) -> Any:
        resolved = self.resolve_call(node.func)
        if resolved:
            resolved["line"] = node.lineno
            self.current_function.calls.append(resolved)
        self.generic_visit(node)


def analyze_backend_calls(backend_symbols: dict[str, BackendFileInfo]) -> None:
    for path in list_backend_files():
        file_key = rel(path)
        file_info = backend_symbols[file_key]
        alias_map, imports = resolve_python_imports(path, backend_symbols)
        file_info.imports = imports
        for imported in imports:
            target_file = imported["file"]
            if target_file in backend_symbols:
                backend_symbols[target_file].imported_by.append(file_key)

        tree = ast.parse(read_text(path), filename=str(path))
        local_symbols = {symbol for symbol, info in file_info.functions.items() if info.kind == "function"}

        for node in tree.body:
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                function_info = file_info.functions.get(node.name)
                if function_info:
                    BackendFunctionCallAnalyzer(
                        current_file=file_key,
                        current_function=function_info,
                        alias_map=alias_map,
                        local_symbols=local_symbols,
                        classes=file_info.classes,
                    ).visit(node)
            elif isinstance(node, ast.ClassDef):
                method_names = set(file_info.classes.get(node.name, {}).get("methods", {}))
                for item in node.body:
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        symbol = f"{node.name}.{item.name}"
                        function_info = file_info.functions.get(symbol)
                        if function_info:
                            BackendFunctionCallAnalyzer(
                                current_file=file_key,
                                current_function=function_info,
                                alias_map=alias_map,
                                local_symbols=method_names,
                                classes=file_info.classes,
                            ).visit(item)

        file_calls: list[dict[str, Any]] = []
        for function in file_info.functions.values():
            function.calls = dedupe_dict_list(function.calls, ("target_file", "target_symbol", "kind", "line"))
            for call in function.calls:
                if call["target_file"] != file_key:
                    file_calls.append(
                        {
                            "from_symbol": function.symbol,
                            "to_file": call["target_file"],
                            "to_symbol": call["target_symbol"],
                            "kind": call["kind"],
                        }
                    )
        file_info.file_calls = dedupe_dict_list(file_calls, ("from_symbol", "to_file", "to_symbol", "kind"))

    for source_file, file_info in backend_symbols.items():
        for function in file_info.functions.values():
            for call in function.calls:
                target_file = call["target_file"]
                target_symbol = call["target_symbol"]
                target_info = backend_symbols.get(target_file)
                if not target_info or target_symbol not in target_info.functions:
                    continue
                target_info.functions[target_symbol].called_by.append(
                    {"source_file": source_file, "source_symbol": function.symbol, "kind": call["kind"]}
                )

    for file_info in backend_symbols.values():
        file_info.imported_by = sorted(set(file_info.imported_by))
        for function in file_info.functions.values():
            function.called_by = dedupe_dict_list(function.called_by, ("source_file", "source_symbol", "kind"))


def resolve_frontend_import(specifier: str, current_file: Path) -> Path | None:
    if specifier.startswith("@/"):
        base = FRONTEND_SRC_ROOT / specifier[2:]
    elif specifier.startswith("."):
        base = (current_file.parent / specifier).resolve()
    else:
        return None

    candidates = []
    if base.suffix in TS_SUFFIXES:
        candidates.append(base)
    else:
        candidates.extend(base.with_suffix(suffix) for suffix in TS_SUFFIXES)
        candidates.extend(base / f"index{suffix}" for suffix in TS_SUFFIXES)
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


TS_IMPORT_RE = re.compile(r"^\s*import\s+(.+?)\s+from\s+[\"']([^\"']+)[\"']\s*;?", re.MULTILINE | re.DOTALL)
TS_FUNCTION_RE = re.compile(r"\b(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(")
TS_ARROW_RE = re.compile(r"\b(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>")
TS_DEFAULT_EXPORT_RE = re.compile(r"\bexport\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(")
TS_HTTP_HANDLER_RE = re.compile(r"\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE)\s*\(")
TS_FETCH_RE = re.compile(r"\bfetch\(\s*([\"'`])(.+?)\1", re.DOTALL)
TS_PROXY_CALL_RE = re.compile(
    r"\bproxyJson\(\s*([\"'`])(.+?)\1\s*,\s*[^,]+,\s*([\"'`])([A-Z]+)\3",
    re.DOTALL,
)
TS_WS_RE = re.compile(r"\bnew\s+WebSocket\(\s*([\"'`])(.+?)\1", re.DOTALL)


def parse_ts_import_clause(clause: str) -> list[str]:
    clause = " ".join(clause.replace("\n", " ").split())
    clause = clause.removeprefix("type ").strip()
    aliases: list[str] = []
    if clause.startswith("* as "):
        return [clause.replace("* as ", "", 1).strip()]
    if "{" in clause:
        before, after = clause.split("{", 1)
        default_name = before.strip().strip(",")
        if default_name:
            aliases.append(default_name)
        named = after.split("}", 1)[0]
        for part in named.split(","):
            token = part.strip()
            if not token:
                continue
            aliases.append(token.split(" as ", 1)[1].strip() if " as " in token else token)
        return aliases
    return [clause] if clause else []


def strip_import_lines(text: str) -> str:
    return "\n".join(line for line in text.splitlines() if not line.lstrip().startswith("import "))


def derive_next_api_path(path: Path) -> str:
    relative = path.relative_to(FRONTEND_SRC_ROOT / "app")
    parts = list(relative.parts[:-1])
    transformed = [normalize_dynamic_path(part) for part in parts]
    return "/" + "/".join(transformed)


def nearest_function_name(lines: list[str], line_index: int) -> str | None:
    pattern = re.compile(
        r"\b(?:export\s+default\s+)?(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(|\b(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(",
    )
    for idx in range(line_index, -1, -1):
        match = pattern.search(lines[idx])
        if match:
            return match.group(1) or match.group(2)
    return None


def infer_http_method(text: str, start_index: int) -> str:
    window = text[start_index : start_index + 280]
    match = re.search(r"method\s*:\s*[\"'](GET|POST|PUT|PATCH|DELETE)[\"']", window)
    return match.group(1) if match else "GET"


def analyze_frontend_files() -> dict[str, Any]:
    file_infos: dict[str, dict[str, Any]] = {}
    inbound: dict[str, list[str]] = defaultdict(list)
    frontend_endpoints: dict[str, dict[str, Any]] = {}

    for path in list_frontend_files():
        file_key = rel(path)
        text = read_text(path)
        code = strip_import_lines(text)
        imports: list[dict[str, Any]] = []
        used_imports: list[dict[str, Any]] = []
        alias_to_target: dict[str, dict[str, str]] = {}

        for match in TS_IMPORT_RE.finditer(text):
            target_path = resolve_frontend_import(match.group(2), path)
            if not target_path:
                continue
            target_key = rel(target_path)
            for alias in parse_ts_import_clause(match.group(1)):
                imports.append({"alias": alias, "target_file": target_key, "source": match.group(2)})
                alias_to_target[alias] = {"file": target_key}
                inbound[target_key].append(file_key)

        for alias, target in alias_to_target.items():
            jsx_match = re.search(rf"<{re.escape(alias)}\b", code)
            call_match = re.search(rf"\b{re.escape(alias)}\s*\(", code)
            member_match = re.search(rf"\b{re.escape(alias)}\.", code)
            if jsx_match or call_match or member_match:
                used_imports.append(
                    {
                        "alias": alias,
                        "target_file": target["file"],
                        "usage": "jsx" if jsx_match else "call" if call_match else "member",
                    }
                )

        functions = sorted(
            set(TS_DEFAULT_EXPORT_RE.findall(text))
            | set(TS_FUNCTION_RE.findall(text))
            | set(TS_ARROW_RE.findall(text))
        )
        lines = text.splitlines()
        fetches: list[dict[str, Any]] = []
        for regex, kind in ((TS_FETCH_RE, "fetch"), (TS_WS_RE, "websocket")):
            for match in regex.finditer(text):
                raw_endpoint = normalize_dynamic_path(match.group(2).strip())
                if "/api/" not in raw_endpoint:
                    continue
                line_number = text[: match.start()].count("\n")
                fetches.append(
                    {
                        "kind": kind,
                        "method": infer_http_method(text, match.end()) if kind == "fetch" else "WEBSOCKET",
                        "endpoint": raw_endpoint,
                        "function": nearest_function_name(lines, line_number),
                    }
                )

        next_route = None
        methods: list[str] = []
        backend_targets: list[dict[str, str]] = []
        if "/src/app/api/" in file_key and path.name == "route.ts":
            next_route = derive_next_api_path(path)
            methods = sorted(set(TS_HTTP_HANDLER_RE.findall(text)))
            for match in TS_PROXY_CALL_RE.finditer(text):
                backend_targets.append(
                    {
                        "method": match.group(4),
                        "path": normalize_dynamic_path(match.group(2).strip()),
                    }
                )
            for match in TS_FETCH_RE.finditer(text):
                raw_endpoint = normalize_dynamic_path(match.group(2).strip())
                if "/api/" not in raw_endpoint:
                    continue
                backend_targets.append(
                    {
                        "method": infer_http_method(text, match.end()),
                        "path": raw_endpoint,
                    }
                )
            frontend_endpoints[file_key] = {
                "file": file_key,
                "frontend_path": next_route,
                "methods": methods,
                "backend_targets": dedupe_dict_list(backend_targets, ("method", "path")),
            }

        file_infos[file_key] = {
            "functions": functions,
            "imports": dedupe_dict_list(imports, ("alias", "target_file")),
            "imported_by": [],
            "used_imports": dedupe_dict_list(used_imports, ("alias", "target_file", "usage")),
            "fetches": dedupe_dict_list(fetches, ("kind", "method", "endpoint", "function")),
            "next_route": next_route,
            "methods": methods,
            "backend_targets": dedupe_dict_list(backend_targets, ("method", "path")),
        }

    for file_key, callers in inbound.items():
        if file_key in file_infos:
            file_infos[file_key]["imported_by"] = sorted(set(callers))

    return {"files": file_infos, "frontend_endpoints": frontend_endpoints}


def collect_backend_endpoints(backend_symbols: dict[str, BackendFileInfo]) -> dict[str, dict[str, Any]]:
    endpoints: dict[str, dict[str, Any]] = {}
    for file_key, file_info in backend_symbols.items():
        for function in file_info.functions.values():
            for route in function.routes:
                endpoints[endpoint_key(route.method, route.path)] = {
                    "method": route.method,
                    "path": normalize_dynamic_path(route.path),
                    "file": file_key,
                    "symbol": function.symbol,
                }
    return endpoints


def find_matching_backend_endpoint(
    backend_endpoints: dict[str, dict[str, Any]],
    method: str,
    requested_path: str,
) -> dict[str, Any] | None:
    requested = normalize_dynamic_path(requested_path)
    direct = next(
        (
            endpoint
            for endpoint in backend_endpoints.values()
            if canonical_endpoint_key(endpoint["method"], endpoint["path"]) == canonical_endpoint_key(method, requested)
        ),
        None,
    )
    if direct:
        return direct
    for endpoint in backend_endpoints.values():
        if canonical_path(endpoint["path"]) == canonical_path(requested):
            return endpoint
    return None


def build_cross_layer_flows(
    frontend_analysis: dict[str, Any],
    backend_endpoints: dict[str, dict[str, Any]],
    backend_symbols: dict[str, BackendFileInfo],
) -> list[dict[str, Any]]:
    frontend_files = frontend_analysis["files"]
    route_files = frontend_analysis["frontend_endpoints"]
    route_lookup: dict[str, dict[str, Any]] = {}
    for route_info in route_files.values():
        for method in route_info["methods"] or ["GET"]:
            route_lookup[canonical_endpoint_key(method, route_info["frontend_path"])] = route_info

    flows: list[dict[str, Any]] = []
    for source_file, info in frontend_files.items():
        if source_file.startswith("apps/web/src/app/api/"):
            continue
        for fetch in info["fetches"]:
            endpoint = fetch["endpoint"]
            if not endpoint.startswith("/api/"):
                continue
            method = fetch["method"]
            route_info = route_lookup.get(canonical_endpoint_key(method, endpoint))
            backend_route = None
            if route_info and route_info["backend_targets"]:
                backend_target = next(
                    (
                        target
                        for target in route_info["backend_targets"]
                        if target["method"] == method
                    ),
                    route_info["backend_targets"][0],
                )
                backend_route = find_matching_backend_endpoint(backend_endpoints, backend_target["method"], backend_target["path"])
            elif endpoint.startswith("/api/"):
                backend_route = find_matching_backend_endpoint(backend_endpoints, method, endpoint)

            downstream_calls: list[dict[str, str]] = []
            if backend_route:
                handler = backend_symbols[backend_route["file"]].functions.get(backend_route["symbol"])
                if handler:
                    downstream_calls = [
                        {"target_file": call["target_file"], "target_symbol": call["target_symbol"]}
                        for call in handler.calls
                        if call["target_file"] != backend_route["file"]
                    ]

            flows.append(
                {
                    "frontend_file": source_file,
                    "frontend_function": fetch["function"],
                    "method": method,
                    "frontend_endpoint": endpoint,
                    "next_route_file": route_info["file"] if route_info else None,
                    "next_route_path": route_info["frontend_path"] if route_info else None,
                    "backend_route_file": backend_route["file"] if backend_route else None,
                    "backend_route_symbol": backend_route["symbol"] if backend_route else None,
                    "backend_path": backend_route["path"] if backend_route else None,
                    "downstream_calls": dedupe_dict_list(downstream_calls, ("target_file", "target_symbol")),
                }
            )
    return flows


def summarize_backend_counts(backend_symbols: dict[str, BackendFileInfo]) -> dict[str, int]:
    return {
        "files": len(backend_symbols),
        "functions": sum(len(file_info.functions) for file_info in backend_symbols.values()),
        "routes": sum(len(function.routes) for file_info in backend_symbols.values() for function in file_info.functions.values()),
    }


def summarize_frontend_counts(frontend_analysis: dict[str, Any]) -> dict[str, int]:
    return {
        "files": len(frontend_analysis["files"]),
        "api_route_files": len(frontend_analysis["frontend_endpoints"]),
        "api_fetches": sum(len(file_info["fetches"]) for file_info in frontend_analysis["files"].values()),
    }


def write_json_report(payload: dict[str, Any]) -> None:
    (OUTPUT_ROOT / "repo-connection-map.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")


def write_backend_markdown(backend_symbols: dict[str, BackendFileInfo]) -> None:
    lines = ["# Backend Function Connectivity", "", "Filter: runtime backend Python only under `apps/api/app/**/*.py`.", ""]
    for file_key in sorted(backend_symbols):
        file_info = backend_symbols[file_key]
        lines.append(f"## `{file_key}`")
        if file_info.imports:
            lines.append("")
            lines.append("Imports from repo:")
            for item in file_info.imports:
                symbol = f"::{item['symbol']}" if item.get("symbol") else ""
                lines.append(f"- `{item['alias']}` -> `{item['file']}{symbol}` ({item['kind']})")
        if file_info.imported_by:
            lines.append("")
            lines.append("Imported by:")
            for caller in file_info.imported_by:
                lines.append(f"- `{caller}`")
        for symbol in sorted(file_info.functions):
            function = file_info.functions[symbol]
            lines.append("")
            lines.append(f"### `{symbol}`")
            lines.append(f"- Line: `{function.line}`")
            lines.append(f"- Kind: `{function.kind}`")
            if function.routes:
                route_text = ", ".join(f"`{route.method} {route.path}`" for route in function.routes)
                lines.append(f"- Routes: {route_text}")
            if function.calls:
                lines.append("- Calls:")
                for call in function.calls:
                    lines.append(f"  - `{call['target_file']}::{call['target_symbol']}` ({call['kind']})")
            else:
                lines.append("- Calls: none resolved to repo symbols")
            if function.called_by:
                lines.append("- Called by:")
                for caller in function.called_by:
                    lines.append(f"  - `{caller['source_file']}::{caller['source_symbol']}` ({caller['kind']})")
            else:
                lines.append("- Called by: none resolved from repo symbols")
        lines.append("")
    (OUTPUT_ROOT / "backend-function-map.md").write_text("\n".join(lines), encoding="utf-8")


def write_repo_markdown(
    frontend_analysis: dict[str, Any],
    backend_endpoints: dict[str, dict[str, Any]],
    flows: list[dict[str, Any]],
) -> None:
    files = frontend_analysis["files"]
    lines = [
        "# Repository File Connectivity",
        "",
        "Filter:",
        "- Frontend runtime files under `apps/web/src/**/*.ts(x)` plus `apps/web/middleware.ts`",
        "- Backend runtime files under `apps/api/app/**/*.py`",
        "- Excludes docs, tests, migrations, SQL, templates, and `node_modules`",
        "",
        "## Cross-Layer Flows",
        "",
    ]
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for flow in flows:
        grouped[flow["frontend_file"]].append(flow)
    if not grouped:
        lines.append("No cross-layer flows resolved.")
        lines.append("")
    for frontend_file in sorted(grouped):
        lines.append(f"### `{frontend_file}`")
        for flow in grouped[frontend_file]:
            caller = flow["frontend_function"] or "(module scope)"
            lines.append(f"- `{caller}` [{flow['method']}] -> `{flow['frontend_endpoint']}`")
            if flow["next_route_file"]:
                lines.append(f"  Next route: `{flow['next_route_file']}` -> `{flow['next_route_path']}`")
            if flow["backend_route_file"]:
                lines.append(f"  Backend handler: `{flow['backend_route_file']}::{flow['backend_route_symbol']}` -> `{flow['backend_path']}`")
            if flow["downstream_calls"]:
                downstream = ", ".join(f"`{item['target_file']}::{item['target_symbol']}`" for item in flow["downstream_calls"])
                lines.append(f"  Handler calls: {downstream}")
        lines.append("")

    lines.append("## Frontend File Map")
    lines.append("")
    for file_key in sorted(files):
        info = files[file_key]
        lines.append(f"### `{file_key}`")
        if info["imports"]:
            lines.append(f"- Imports: {', '.join(f'`{item['target_file']}`' for item in info['imports'])}")
        if info["used_imports"]:
            used = ", ".join(f"`{item['alias']}` -> `{item['target_file']}` ({item['usage']})" for item in info["used_imports"])
            lines.append(f"- Active repo usages: {used}")
        if info["imported_by"]:
            lines.append(f"- Imported by: {', '.join(f'`{item}`' for item in info['imported_by'])}")
        if info["fetches"]:
            fetches = ", ".join(
                f"`{item['function'] or '(module)'}` [{item['method']}] -> {item['endpoint']}" for item in info["fetches"]
            )
            lines.append(f"- API calls: {fetches}")
        if info["next_route"]:
            methods = ", ".join(info["methods"]) if info["methods"] else "unknown"
            proxied = (
                ", ".join(f"`{item['method']} {item['path']}`" for item in info["backend_targets"])
                if info["backend_targets"]
                else "none"
            )
            lines.append(f"- Next route: `{info['next_route']}` [{methods}]")
            lines.append(f"- Proxies to backend: {proxied}")
        lines.append("")

    lines.append("## Backend Endpoints")
    lines.append("")
    for key in sorted(backend_endpoints):
        endpoint = backend_endpoints[key]
        lines.append(f"- `{endpoint['method']} {endpoint['path']}` -> `{endpoint['file']}::{endpoint['symbol']}`")
    lines.append("")
    (OUTPUT_ROOT / "repo-file-map.md").write_text("\n".join(lines), encoding="utf-8")


def write_mermaid_summary(frontend_analysis: dict[str, Any], flows: list[dict[str, Any]]) -> None:
    def node_id(name: str) -> str:
        return re.sub(r"[^A-Za-z0-9_]", "_", name)

    console_callers = sorted(
        file_key
        for file_key, info in frontend_analysis["files"].items()
        if not file_key.startswith("apps/web/src/app/api/")
        if any(fetch["endpoint"].startswith("/api/") for fetch in info["fetches"])
    )
    route_files = sorted(frontend_analysis["frontend_endpoints"])
    backend_route_files = sorted({flow["backend_route_file"] for flow in flows if flow["backend_route_file"]})
    downstream_files = sorted({item["target_file"] for flow in flows for item in flow["downstream_calls"]})

    lines = ["flowchart LR", '  subgraph Frontend["Frontend Callers"]']
    for file_key in console_callers:
        lines.append(f'    {node_id(file_key)}["{file_key}"]')
    lines.append("  end")
    lines.append('  subgraph NextApi["Next API Bridge"]')
    for file_key in route_files:
        lines.append(f'    {node_id(file_key)}["{file_key}"]')
    lines.append("  end")
    lines.append('  subgraph FastApi["FastAPI Routes"]')
    for file_key in backend_route_files:
        lines.append(f'    {node_id(file_key)}["{file_key}"]')
    lines.append("  end")
    lines.append('  subgraph Backend["Backend Services and Engines"]')
    for file_key in downstream_files:
        lines.append(f'    {node_id(file_key)}["{file_key}"]')
    lines.append("  end")

    seen_edges: set[tuple[str, str, str]] = set()
    for flow in flows:
        if flow["frontend_file"] and flow["next_route_file"]:
            edge = (flow["frontend_file"], flow["next_route_file"], normalize_dynamic_path(flow["frontend_endpoint"]))
            if edge not in seen_edges:
                seen_edges.add(edge)
                lines.append(f'  {node_id(edge[0])} -->|"{edge[2]}"| {node_id(edge[1])}')
        if flow["next_route_file"] and flow["backend_route_file"]:
            edge = (flow["next_route_file"], flow["backend_route_file"], flow["backend_path"] or "proxy")
            if edge not in seen_edges:
                seen_edges.add(edge)
                lines.append(f'  {node_id(edge[0])} -->|"{edge[2]}"| {node_id(edge[1])}')
        if flow["backend_route_file"]:
            for downstream in flow["downstream_calls"][:6]:
                edge = (flow["backend_route_file"], downstream["target_file"], downstream["target_symbol"])
                if edge in seen_edges:
                    continue
                seen_edges.add(edge)
                lines.append(f'  {node_id(edge[0])} -->|"{edge[2]}"| {node_id(edge[1])}')

    (OUTPUT_ROOT / "filtered-overview.mmd").write_text("\n".join(lines), encoding="utf-8")


def build_payload(
    backend_symbols: dict[str, BackendFileInfo],
    frontend_analysis: dict[str, Any],
    backend_endpoints: dict[str, dict[str, Any]],
    flows: list[dict[str, Any]],
) -> dict[str, Any]:
    backend_json = {}
    for file_key, info in backend_symbols.items():
        backend_json[file_key] = {
            "module": info.module,
            "route_prefix": info.route_prefix,
            "imports": info.imports,
            "imported_by": info.imported_by,
            "file_calls": info.file_calls,
            "functions": {
                symbol: {
                    "line": function.line,
                    "kind": function.kind,
                    "class_name": function.class_name,
                    "routes": [route.as_dict() for route in function.routes],
                    "calls": function.calls,
                    "called_by": function.called_by,
                }
                for symbol, function in info.functions.items()
            },
        }
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "filters": {
            "included": ["apps/api/app/**/*.py", "apps/web/src/**/*.ts", "apps/web/src/**/*.tsx", "apps/web/middleware.ts"],
            "excluded": ["docs/**", "apps/api/tests/**", "apps/api/alembic/**", "apps/api/sql/**", "node_modules/**", "packages/templates/**"],
        },
        "counts": {
            "backend": summarize_backend_counts(backend_symbols),
            "frontend": summarize_frontend_counts(frontend_analysis),
            "cross_layer_flows": len(flows),
        },
        "backend": {"files": backend_json, "endpoints": backend_endpoints},
        "frontend": frontend_analysis,
        "cross_layer_flows": flows,
    }


def main() -> None:
    ensure_output_dir()
    backend_symbols = build_backend_symbol_table()
    analyze_backend_calls(backend_symbols)
    frontend_analysis = analyze_frontend_files()
    backend_endpoints = collect_backend_endpoints(backend_symbols)
    flows = build_cross_layer_flows(frontend_analysis, backend_endpoints, backend_symbols)
    payload = build_payload(backend_symbols, frontend_analysis, backend_endpoints, flows)
    write_json_report(payload)
    write_backend_markdown(backend_symbols)
    write_repo_markdown(frontend_analysis, backend_endpoints, flows)
    write_mermaid_summary(frontend_analysis, flows)
    print(json.dumps(payload["counts"], indent=2))


if __name__ == "__main__":
    main()
