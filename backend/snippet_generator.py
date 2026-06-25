"""
Code Snippet Generator — produces ready-to-run code for a request in multiple languages.
"""

import json
from typing import List
from schemas import KeyValueItem, SnippetRequest


def generate_snippet(req: SnippetRequest) -> str:
    """Generate a code snippet based on the chosen language."""
    generators = {
        "curl": _curl,
        "fetch": _fetch,
        "python": _python_requests,
        "nodejs": _nodejs_axios,
    }
    fn = generators.get(req.language, _curl)
    return fn(req)


def _build_headers_dict(headers: List[KeyValueItem]) -> dict:
    return {h.key: h.value for h in headers if h.is_active and h.key}


def _curl(req: SnippetRequest) -> str:
    lines = [f"curl -X {req.method.upper()} '{req.url}'"]
    for h in req.headers:
        if h.is_active and h.key:
            lines.append(f"  -H '{h.key}: {h.value}'")
    if req.body_type == "raw" and req.body_raw:
        escaped = req.body_raw.replace("'", "'\\''")
        lines.append(f"  -d '{escaped}'")
    return " \\\n".join(lines)


def _fetch(req: SnippetRequest) -> str:
    headers = _build_headers_dict(req.headers)
    opts = [f'  method: "{req.method.upper()}"']
    if headers:
        opts.append(f"  headers: {json.dumps(headers, indent=4)}")
    if req.body_type == "raw" and req.body_raw:
        opts.append(f"  body: {json.dumps(req.body_raw)}")
    options_str = ",\n".join(opts)
    return f"""const response = await fetch("{req.url}", {{
{options_str}
}});

const data = await response.json();
console.log(data);"""


def _python_requests(req: SnippetRequest) -> str:
    headers = _build_headers_dict(req.headers)
    lines = ["import requests", ""]
    args = [f'    "{req.url}"']
    if headers:
        lines.append(f"headers = {json.dumps(headers, indent=4)}")
        args.append("    headers=headers")
    if req.body_type == "raw" and req.body_raw:
        lines.append(f"payload = {json.dumps(req.body_raw)}")
        args.append("    data=payload")
    args_str = ",\n".join(args)
    lines.append(f"\nresponse = requests.{req.method.lower()}(\n{args_str}\n)")
    lines.append("print(response.status_code)")
    lines.append("print(response.json())")
    return "\n".join(lines)


def _nodejs_axios(req: SnippetRequest) -> str:
    headers = _build_headers_dict(req.headers)
    config_parts = [f'  method: "{req.method.lower()}"', f'  url: "{req.url}"']
    if headers:
        config_parts.append(f"  headers: {json.dumps(headers, indent=4)}")
    if req.body_type == "raw" and req.body_raw:
        config_parts.append(f"  data: {json.dumps(req.body_raw)}")
    config_str = ",\n".join(config_parts)
    return f"""const axios = require('axios');

async function makeRequest() {{
  const response = await axios({{
{config_str}
  }});
  console.log(response.data);
}}

makeRequest();"""
