"""
Pydantic schemas — these define what data goes IN (requests) and OUT (responses).
Think of them as TypeScript interfaces for the API.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Any, Dict
from datetime import datetime


# ─── Variable ────────────────────────────────────────────────────────────────

class VariableBase(BaseModel):
    key: str
    value: str = ""
    is_secret: bool = False
    is_active: bool = True

class VariableCreate(VariableBase):
    pass

class VariableUpdate(BaseModel):
    key: Optional[str] = None
    value: Optional[str] = None
    is_secret: Optional[bool] = None
    is_active: Optional[bool] = None

class VariableOut(VariableBase):
    id: int
    environment_id: int

    class Config:
        from_attributes = True


# ─── Environment ─────────────────────────────────────────────────────────────

class EnvironmentBase(BaseModel):
    name: str

class EnvironmentCreate(EnvironmentBase):
    workspace_id: int
    variables: List[VariableCreate] = []

class EnvironmentUpdate(BaseModel):
    name: Optional[str] = None

class EnvironmentOut(EnvironmentBase):
    id: int
    workspace_id: int
    created_at: datetime
    updated_at: datetime
    variables: List[VariableOut] = []

    class Config:
        from_attributes = True


# ─── Header ──────────────────────────────────────────────────────────────────

class HeaderBase(BaseModel):
    key: str
    value: str = ""
    description: str = ""
    is_active: bool = True

class HeaderCreate(HeaderBase):
    pass

class HeaderOut(HeaderBase):
    id: int
    request_id: int

    class Config:
        from_attributes = True


# ─── QueryParam ──────────────────────────────────────────────────────────────

class QueryParamBase(BaseModel):
    key: str
    value: str = ""
    description: str = ""
    is_active: bool = True

class QueryParamCreate(QueryParamBase):
    pass

class QueryParamOut(QueryParamBase):
    id: int
    request_id: int

    class Config:
        from_attributes = True


# ─── Request ─────────────────────────────────────────────────────────────────

class RequestBase(BaseModel):
    name: str
    method: str = "GET"
    url: str = ""
    description: str = ""
    body_type: str = "none"
    body_content: str = ""
    body_language: str = "json"
    auth_type: str = "none"
    auth_data: Dict[str, Any] = {}

class RequestCreate(RequestBase):
    collection_id: int
    folder_id: Optional[int] = None
    headers: List[HeaderCreate] = []
    query_params: List[QueryParamCreate] = []

class RequestUpdate(BaseModel):
    name: Optional[str] = None
    method: Optional[str] = None
    url: Optional[str] = None
    description: Optional[str] = None
    body_type: Optional[str] = None
    body_content: Optional[str] = None
    body_language: Optional[str] = None
    auth_type: Optional[str] = None
    auth_data: Optional[Dict[str, Any]] = None
    folder_id: Optional[int] = None
    headers: Optional[List[HeaderCreate]] = None
    query_params: Optional[List[QueryParamCreate]] = None

class RequestOut(RequestBase):
    id: int
    collection_id: int
    folder_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    headers: List[HeaderOut] = []
    query_params: List[QueryParamOut] = []

    class Config:
        from_attributes = True


# ─── Folder ──────────────────────────────────────────────────────────────────

class FolderBase(BaseModel):
    name: str

class FolderCreate(FolderBase):
    collection_id: int

class FolderUpdate(BaseModel):
    name: Optional[str] = None

class FolderOut(FolderBase):
    id: int
    collection_id: int
    created_at: datetime
    requests: List[RequestOut] = []

    class Config:
        from_attributes = True


# ─── Collection ───────────────────────────────────────────────────────────────

class CollectionBase(BaseModel):
    name: str
    description: str = ""

class CollectionCreate(CollectionBase):
    workspace_id: int

class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class CollectionOut(CollectionBase):
    id: int
    workspace_id: int
    created_at: datetime
    updated_at: datetime
    folders: List[FolderOut] = []
    requests: List[RequestOut] = []

    class Config:
        from_attributes = True


# ─── Workspace ────────────────────────────────────────────────────────────────

class WorkspaceBase(BaseModel):
    name: str
    description: str = ""

class WorkspaceCreate(WorkspaceBase):
    pass

class WorkspaceOut(WorkspaceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ─── History ─────────────────────────────────────────────────────────────────

class HistoryOut(BaseModel):
    id: int
    request_id: Optional[int]
    method: str
    url: str
    headers_snapshot: Dict[str, Any] = {}
    params_snapshot: Dict[str, Any] = {}
    body_type: str
    body_snapshot: str
    environment_id: Optional[int]
    environment_name: str
    status_code: Optional[int]
    status_text: str
    response_time_ms: Optional[float]
    response_size_bytes: Optional[int]
    response_headers: Dict[str, Any] = {}
    response_body: str
    executed_at: datetime
    is_error: bool
    error_message: str

    class Config:
        from_attributes = True


# ─── Runner (Send Request) ────────────────────────────────────────────────────

class KeyValueItem(BaseModel):
    key: str
    value: str
    is_active: bool = True

class FormDataItem(BaseModel):
    key: str
    value: str
    type: str = "text"   # text | file
    is_active: bool = True

class AuthConfig(BaseModel):
    type: str = "none"   # none | bearer | basic | api-key
    token: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    api_key: Optional[str] = None
    api_value: Optional[str] = None
    api_in: Optional[str] = "header"  # header | query

class SendRequestBody(BaseModel):
    """What the frontend sends when hitting the Send button."""
    method: str
    url: str
    headers: List[KeyValueItem] = []
    query_params: List[KeyValueItem] = []
    body_type: str = "none"        # none | raw | form-data | urlencoded
    body_raw: Optional[str] = None
    body_language: Optional[str] = "json"
    body_form: Optional[List[FormDataItem]] = []
    auth: Optional[AuthConfig] = None
    environment_id: Optional[int] = None
    # If this send is from a saved request
    request_id: Optional[int] = None

class SendResponseOut(BaseModel):
    """What the backend returns after executing the request."""
    status_code: Optional[int]
    status_text: str
    response_time_ms: float
    response_size_bytes: int
    response_headers: Dict[str, Any]
    response_body: str
    is_error: bool
    error_message: str
    history_id: int


# ─── Code Snippet ────────────────────────────────────────────────────────────

class SnippetRequest(BaseModel):
    method: str
    url: str
    headers: List[KeyValueItem] = []
    body_type: str = "none"
    body_raw: Optional[str] = None
    language: str = "curl"   # curl | fetch | python | nodejs


# ─── Import/Export ───────────────────────────────────────────────────────────

class ExportRequest(BaseModel):
    collection_id: int
