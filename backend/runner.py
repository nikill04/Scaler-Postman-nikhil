"""
HTTP Runner — the core of the backend.

Receives a SendRequestBody, resolves environment variables,
builds and fires the real HTTP request using aiohttp,
then records it in History and returns the result.
"""

import time
import json
import aiohttp
from typing import Optional, Dict
from sqlalchemy.orm import Session

from schemas import SendRequestBody, SendResponseOut, KeyValueItem
from models import History
from resolver import get_env_variables, resolve, resolve_dict_values


async def execute_request(
    payload: SendRequestBody,
    db: Session
) -> SendResponseOut:
    """
    Main function: takes the frontend payload, runs the HTTP call,
    saves history, returns the response.
    """

    # 1. Load environment variables for {{}} resolution
    variables = get_env_variables(db, payload.environment_id)
    env_name = ""
    if payload.environment_id:
        from models import Environment
        env = db.query(Environment).filter(Environment.id == payload.environment_id).first()
        env_name = env.name if env else ""

    # 2. Resolve variables in URL
    resolved_url = resolve(payload.url, variables)

    # 3. Build query params dict (only active ones)
    params: Dict[str, str] = {}
    for p in payload.query_params:
        if p.is_active and p.key:
            params[p.key] = resolve(p.value, variables)

    # 4. Build headers dict (only active ones)
    headers: Dict[str, str] = {}
    for h in payload.headers:
        if h.is_active and h.key:
            headers[h.key] = resolve(h.value, variables)

    # 5. Handle auth — injects into headers or params
    if payload.auth and payload.auth.type != "none":
        auth = payload.auth
        if auth.type == "bearer" and auth.token:
            headers["Authorization"] = f"Bearer {resolve(auth.token, variables)}"
        elif auth.type == "basic" and auth.username and auth.password:
            import base64
            credentials = f"{auth.username}:{auth.password}"
            encoded = base64.b64encode(credentials.encode()).decode()
            headers["Authorization"] = f"Basic {encoded}"
        elif auth.type == "api-key" and auth.api_key and auth.api_value:
            if auth.api_in == "header":
                headers[auth.api_key] = resolve(auth.api_value, variables)
            else:
                params[auth.api_key] = resolve(auth.api_value, variables)

    # 6. Build request body
    request_body = None
    body_snapshot = ""
    content_type_set = "Content-Type" in headers

    if payload.body_type == "raw" and payload.body_raw:
        body_snapshot = resolve(payload.body_raw, variables)
        request_body = body_snapshot
        if not content_type_set:
            lang = payload.body_language or "json"
            ct_map = {
                "json": "application/json",
                "text": "text/plain",
                "xml": "application/xml",
                "html": "text/html",
            }
            headers["Content-Type"] = ct_map.get(lang, "text/plain")

    elif payload.body_type == "urlencoded" and payload.body_form:
        form_data = {
            item.key: resolve(item.value, variables)
            for item in payload.body_form
            if item.is_active and item.key
        }
        body_snapshot = "&".join(f"{k}={v}" for k, v in form_data.items())
        request_body = form_data
        if not content_type_set:
            headers["Content-Type"] = "application/x-www-form-urlencoded"

    elif payload.body_type == "form-data" and payload.body_form:
        # multipart/form-data — aiohttp handles this as FormData
        form = aiohttp.FormData()
        form_snapshot = {}
        for item in payload.body_form:
            if item.is_active and item.key:
                val = resolve(item.value, variables)
                form.add_field(item.key, val)
                form_snapshot[item.key] = val
        body_snapshot = json.dumps(form_snapshot)
        request_body = form

    # 7. Execute the HTTP request
    start_time = time.perf_counter()
    status_code = None
    status_text = ""
    response_headers: Dict[str, str] = {}
    response_body = ""
    response_size = 0
    is_error = False
    error_message = ""

    try:
        timeout = aiohttp.ClientTimeout(total=30)  # 30 second timeout
        async with aiohttp.ClientSession(timeout=timeout) as session:
            # Build kwargs dynamically based on body type
            kwargs = {
                "headers": headers,
                "params": params if params else None,
                "ssl": False,  # Don't verify SSL for dev convenience
            }

            if payload.body_type == "raw" and request_body:
                kwargs["data"] = request_body
            elif payload.body_type == "urlencoded" and isinstance(request_body, dict):
                kwargs["data"] = request_body
            elif payload.body_type == "form-data" and isinstance(request_body, aiohttp.FormData):
                kwargs["data"] = request_body

            method = payload.method.upper()
            async with session.request(method, resolved_url, **kwargs) as resp:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                status_code = resp.status
                status_text = resp.reason or ""
                # Convert headers to plain dict
                response_headers = dict(resp.headers)
                # Read body as text
                raw_bytes = await resp.read()
                response_size = len(raw_bytes)
                try:
                    response_body = raw_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    response_body = f"[Binary content, {response_size} bytes]"

    except aiohttp.ClientConnectorError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        is_error = True
        error_message = f"Connection failed: {str(e)}"
    except aiohttp.ServerTimeoutError:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        is_error = True
        error_message = "Request timed out after 30 seconds"
    except aiohttp.InvalidURL:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        is_error = True
        error_message = f"Invalid URL: {resolved_url}"
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        is_error = True
        error_message = str(e)

    # 8. Save to history
    history_entry = History(
        request_id=payload.request_id,
        method=payload.method.upper(),
        url=resolved_url,
        headers_snapshot=headers,
        params_snapshot=params,
        body_type=payload.body_type,
        body_snapshot=body_snapshot,
        environment_id=payload.environment_id,
        environment_name=env_name,
        status_code=status_code,
        status_text=status_text,
        response_time_ms=round(elapsed_ms, 2),
        response_size_bytes=response_size,
        response_headers=response_headers,
        response_body=response_body,
        is_error=is_error,
        error_message=error_message,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(history_entry)

    return SendResponseOut(
        status_code=status_code,
        status_text=status_text,
        response_time_ms=round(elapsed_ms, 2),
        response_size_bytes=response_size,
        response_headers=response_headers,
        response_body=response_body,
        is_error=is_error,
        error_message=error_message,
        history_id=history_entry.id,
    )
