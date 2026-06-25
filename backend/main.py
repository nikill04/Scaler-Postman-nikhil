"""
PostmanClone Backend — FastAPI
==============================

Architecture:
  - FastAPI handles all routes
  - SQLite via SQLAlchemy for persistence
  - aiohttp as async HTTP client (proxy runner)
  - All routes return JSON; frontend is a separate Next.js app

Run with:
  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
import json

from database import get_db, create_tables
from seed import seed
from models import (
    Workspace, Collection, Folder, Request as RequestModel,
    Header, QueryParam, Environment, Variable, History
)
from schemas import (
    WorkspaceCreate, WorkspaceOut,
    CollectionCreate, CollectionOut, CollectionUpdate,
    FolderCreate, FolderOut, FolderUpdate,
    RequestCreate, RequestOut, RequestUpdate,
    EnvironmentCreate, EnvironmentOut, EnvironmentUpdate,
    VariableCreate, VariableOut, VariableUpdate,
    HistoryOut,
    SendRequestBody, SendResponseOut,
    SnippetRequest, ExportRequest,
)
from runner import execute_request
from snippet_generator import generate_snippet

app = FastAPI(title="PostmanClone API", version="1.0.0")

# Allow the Next.js frontend (running on port 3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://nikhils-postman.vercel.app",  # replace with your actual Vercel URL
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Create tables and seed on first run."""
    create_tables()
    db = next(get_db())
    try:
        seed(db)
    finally:
        db.close()


# ═══════════════════════════════════════════════════════════════════════════
# Workspaces
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/workspaces", response_model=List[WorkspaceOut])
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).all()


@app.post("/workspaces", response_model=WorkspaceOut, status_code=201)
def create_workspace(body: WorkspaceCreate, db: Session = Depends(get_db)):
    ws = Workspace(**body.model_dump())
    db.add(ws)
    db.commit()
    db.refresh(ws)
    return ws


@app.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(workspace_id: int, db: Session = Depends(get_db)):
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not ws:
        raise HTTPException(404, "Workspace not found")
    return ws


# ═══════════════════════════════════════════════════════════════════════════
# Collections
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/workspaces/{workspace_id}/collections", response_model=List[CollectionOut])
def list_collections(workspace_id: int, db: Session = Depends(get_db)):
    """
    Returns all collections for a workspace, with their folders and requests
    nested inside (eager loaded for efficiency).
    """
    return (
        db.query(Collection)
        .options(
            joinedload(Collection.folders).joinedload(Folder.requests)
            .joinedload(RequestModel.headers),
            joinedload(Collection.folders).joinedload(Folder.requests)
            .joinedload(RequestModel.query_params),
            joinedload(Collection.requests).joinedload(RequestModel.headers),
            joinedload(Collection.requests).joinedload(RequestModel.query_params),
        )
        .filter(Collection.workspace_id == workspace_id)
        .all()
    )


@app.post("/collections", response_model=CollectionOut, status_code=201)
def create_collection(body: CollectionCreate, db: Session = Depends(get_db)):
    col = Collection(**body.model_dump())
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


@app.get("/collections/{collection_id}", response_model=CollectionOut)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    col = db.query(Collection).options(
        joinedload(Collection.folders).joinedload(Folder.requests),
        joinedload(Collection.requests),
    ).filter(Collection.id == collection_id).first()
    if not col:
        raise HTTPException(404, "Collection not found")
    return col


@app.patch("/collections/{collection_id}", response_model=CollectionOut)
def update_collection(collection_id: int, body: CollectionUpdate, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == collection_id).first()
    if not col:
        raise HTTPException(404, "Collection not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(col, field, val)
    db.commit()
    db.refresh(col)
    return col


@app.delete("/collections/{collection_id}", status_code=204)
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    col = db.query(Collection).filter(Collection.id == collection_id).first()
    if not col:
        raise HTTPException(404, "Collection not found")
    db.delete(col)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════
# Folders
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/folders", response_model=FolderOut, status_code=201)
def create_folder(body: FolderCreate, db: Session = Depends(get_db)):
    folder = Folder(**body.model_dump())
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return folder


@app.patch("/folders/{folder_id}", response_model=FolderOut)
def update_folder(folder_id: int, body: FolderUpdate, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(404, "Folder not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(folder, field, val)
    db.commit()
    db.refresh(folder)
    return folder


@app.delete("/folders/{folder_id}", status_code=204)
def delete_folder(folder_id: int, db: Session = Depends(get_db)):
    folder = db.query(Folder).filter(Folder.id == folder_id).first()
    if not folder:
        raise HTTPException(404, "Folder not found")
    db.delete(folder)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════
# Requests
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/requests", response_model=RequestOut, status_code=201)
def create_request(body: RequestCreate, db: Session = Depends(get_db)):
    """Save a new request. Headers and query params are saved inline."""
    req_data = body.model_dump(exclude={"headers", "query_params"})
    req = RequestModel(**req_data)
    db.add(req)
    db.flush()  # get req.id

    for h in body.headers:
        db.add(Header(request_id=req.id, **h.model_dump()))
    for p in body.query_params:
        db.add(QueryParam(request_id=req.id, **p.model_dump()))

    db.commit()
    db.refresh(req)
    return req


@app.get("/requests/{request_id}", response_model=RequestOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(RequestModel).options(
        joinedload(RequestModel.headers),
        joinedload(RequestModel.query_params),
    ).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    return req


@app.patch("/requests/{request_id}", response_model=RequestOut)
def update_request(request_id: int, body: RequestUpdate, db: Session = Depends(get_db)):
    """
    Update a saved request. When headers/query_params are provided,
    we replace all existing ones (simple full-replace strategy).
    """
    req = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")

    update_data = body.model_dump(exclude_none=True, exclude={"headers", "query_params"})
    for field, val in update_data.items():
        setattr(req, field, val)

    # Replace headers if provided
    if body.headers is not None:
        db.query(Header).filter(Header.request_id == request_id).delete()
        for h in body.headers:
            db.add(Header(request_id=request_id, **h.model_dump()))

    # Replace query_params if provided
    if body.query_params is not None:
        db.query(QueryParam).filter(QueryParam.request_id == request_id).delete()
        for p in body.query_params:
            db.add(QueryParam(request_id=request_id, **p.model_dump()))

    db.commit()
    db.refresh(req)
    return req


@app.delete("/requests/{request_id}", status_code=204)
def delete_request(request_id: int, db: Session = Depends(get_db)):
    req = db.query(RequestModel).filter(RequestModel.id == request_id).first()
    if not req:
        raise HTTPException(404, "Request not found")
    db.delete(req)
    db.commit()


# ═══════════════════════════════════════════════════════════════════════════
# Environments & Variables
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/workspaces/{workspace_id}/environments", response_model=List[EnvironmentOut])
def list_environments(workspace_id: int, db: Session = Depends(get_db)):
    return (
        db.query(Environment)
        .options(joinedload(Environment.variables))
        .filter(Environment.workspace_id == workspace_id)
        .all()
    )


@app.post("/environments", response_model=EnvironmentOut, status_code=201)
def create_environment(body: EnvironmentCreate, db: Session = Depends(get_db)):
    env = Environment(workspace_id=body.workspace_id, name=body.name)
    db.add(env)
    db.flush()
    for v in body.variables:
        db.add(Variable(environment_id=env.id, **v.model_dump()))
    db.commit()
    db.refresh(env)
    return env


@app.get("/environments/{env_id}", response_model=EnvironmentOut)
def get_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).options(
        joinedload(Environment.variables)
    ).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(404, "Environment not found")
    return env


@app.patch("/environments/{env_id}", response_model=EnvironmentOut)
def update_environment(env_id: int, body: EnvironmentUpdate, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(404, "Environment not found")
    for field, val in body.model_dump(exclude_none=True).items():
        setattr(env, field, val)
    db.commit()
    db.refresh(env)
    return env


@app.delete("/environments/{env_id}", status_code=204)
def delete_environment(env_id: int, db: Session = Depends(get_db)):
    env = db.query(Environment).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(404, "Environment not found")
    db.delete(env)
    db.commit()


@app.put("/environments/{env_id}/variables", response_model=EnvironmentOut)
def replace_variables(env_id: int, variables: List[VariableCreate], db: Session = Depends(get_db)):
    """Replace all variables for an environment (used when saving from the UI)."""
    env = db.query(Environment).options(
        joinedload(Environment.variables)
    ).filter(Environment.id == env_id).first()
    if not env:
        raise HTTPException(404, "Environment not found")

    db.query(Variable).filter(Variable.environment_id == env_id).delete()
    for v in variables:
        db.add(Variable(environment_id=env_id, **v.model_dump()))
    db.commit()
    db.refresh(env)
    return env


# ═══════════════════════════════════════════════════════════════════════════
# History
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/history", response_model=List[HistoryOut])
def list_history(
    limit: int = Query(100, le=500),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    return (
        db.query(History)
        .order_by(History.executed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )


@app.delete("/history", status_code=204)
def clear_history(db: Session = Depends(get_db)):
    db.query(History).delete()
    db.commit()


@app.delete("/history/{history_id}", status_code=204)
def delete_history_entry(history_id: int, db: Session = Depends(get_db)):
    entry = db.query(History).filter(History.id == history_id).first()
    if not entry:
        raise HTTPException(404, "History entry not found")
    db.delete(entry)
    db.commit()


@app.get("/history/{history_id}", response_model=HistoryOut)
def get_history_entry(history_id: int, db: Session = Depends(get_db)):
    entry = db.query(History).filter(History.id == history_id).first()
    if not entry:
        raise HTTPException(404, "History entry not found")
    return entry


# ═══════════════════════════════════════════════════════════════════════════
# Runner — Send HTTP Request (the core feature)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/run", response_model=SendResponseOut)
async def run_request(body: SendRequestBody, db: Session = Depends(get_db)):
    """
    The main endpoint the frontend calls when the user clicks Send.
    Proxies the request to avoid CORS issues.
    """
    return await execute_request(body, db)


# ═══════════════════════════════════════════════════════════════════════════
# Code Snippet Generation (Bonus)
# ═══════════════════════════════════════════════════════════════════════════

@app.post("/snippet")
def get_snippet(body: SnippetRequest):
    """Generate a code snippet for a request in the specified language."""
    return {"code": generate_snippet(body)}


# ═══════════════════════════════════════════════════════════════════════════
# Import / Export Collection (Bonus)
# ═══════════════════════════════════════════════════════════════════════════

@app.get("/collections/{collection_id}/export")
def export_collection(collection_id: int, db: Session = Depends(get_db)):
    """
    Export a collection in Postman Collection v2.1 format.
    This is the standard format that can be imported into real Postman.
    """
    col = db.query(Collection).options(
        joinedload(Collection.folders).joinedload(Folder.requests)
        .joinedload(RequestModel.headers),
        joinedload(Collection.folders).joinedload(Folder.requests)
        .joinedload(RequestModel.query_params),
        joinedload(Collection.requests).joinedload(RequestModel.headers),
        joinedload(Collection.requests).joinedload(RequestModel.query_params),
    ).filter(Collection.id == collection_id).first()

    if not col:
        raise HTTPException(404, "Collection not found")

    def req_to_item(req: RequestModel) -> dict:
        return {
            "name": req.name,
            "request": {
                "method": req.method,
                "header": [
                    {"key": h.key, "value": h.value, "disabled": not h.is_active}
                    for h in req.headers
                ],
                "url": {
                    "raw": req.url,
                    "query": [
                        {"key": p.key, "value": p.value, "disabled": not p.is_active}
                        for p in req.query_params
                    ]
                },
                "body": {
                    "mode": req.body_type if req.body_type != "none" else "raw",
                    "raw": req.body_content if req.body_type == "raw" else "",
                } if req.body_type != "none" else None,
                "description": req.description,
            }
        }

    items = []
    # Direct requests (not in folders)
    for req in col.requests:
        items.append(req_to_item(req))
    # Folders with their requests
    for folder in col.folders:
        items.append({
            "name": folder.name,
            "item": [req_to_item(r) for r in folder.requests]
        })

    postman_export = {
        "info": {
            "name": col.name,
            "description": col.description,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": items
    }

    return postman_export


@app.post("/collections/import")
async def import_collection(
    workspace_id: int,
    collection_data: dict,
    db: Session = Depends(get_db)
):
    """
    Import a Postman Collection v2 / v2.1 JSON.
    The frontend sends the parsed JSON object.
    """
    info = collection_data.get("info", {})
    col = Collection(
        workspace_id=workspace_id,
        name=info.get("name", "Imported Collection"),
        description=info.get("description", ""),
    )
    db.add(col)
    db.flush()

    def process_item(item: dict, folder_id=None):
        if "item" in item:
            # This is a folder
            folder = Folder(collection_id=col.id, name=item.get("name", "Folder"))
            db.add(folder)
            db.flush()
            for sub_item in item["item"]:
                process_item(sub_item, folder_id=folder.id)
        else:
            # This is a request
            req_data = item.get("request", {})
            method = req_data.get("method", "GET")
            url_data = req_data.get("url", {})
            url = url_data.get("raw", "") if isinstance(url_data, dict) else url_data

            body_data = req_data.get("body") or {}
            body_type = body_data.get("mode", "none") if body_data else "none"
            body_content = body_data.get("raw", "") if body_data else ""

            req = RequestModel(
                collection_id=col.id,
                folder_id=folder_id,
                name=item.get("name", "Request"),
                method=method,
                url=url,
                description=req_data.get("description", ""),
                body_type=body_type,
                body_content=body_content,
            )
            db.add(req)
            db.flush()

            for h in req_data.get("header", []):
                db.add(Header(
                    request_id=req.id,
                    key=h.get("key", ""),
                    value=h.get("value", ""),
                    is_active=not h.get("disabled", False)
                ))

            url_query = url_data.get("query", []) if isinstance(url_data, dict) else []
            for p in url_query:
                db.add(QueryParam(
                    request_id=req.id,
                    key=p.get("key", ""),
                    value=p.get("value", ""),
                    is_active=not p.get("disabled", False)
                ))

    for item in collection_data.get("item", []):
        process_item(item)

    db.commit()
    db.refresh(col)
    return {"message": "Collection imported successfully", "collection_id": col.id}


@app.get("/health")
def health():
    return {"status": "ok", "message": "PostmanClone API is running"}
