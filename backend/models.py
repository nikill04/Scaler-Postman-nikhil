"""
Database models for PostmanClone.

Schema Design:
  Workspaces → Collections → Folders (optional) → Requests
                                                  → Headers
                                                  → QueryParams
                                                  → Auth
  Workspaces → Environments → Variables
  History (standalone audit log of every send)
"""

from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, Float, JSON
)
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    collections = relationship("Collection", back_populates="workspace", cascade="all, delete-orphan")
    environments = relationship("Environment", back_populates="workspace", cascade="all, delete-orphan")


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="collections")
    # A collection can have folders and direct requests
    folders = relationship("Folder", back_populates="collection", cascade="all, delete-orphan")
    requests = relationship(
        "Request",
        primaryjoin="and_(Request.collection_id==Collection.id, Request.folder_id==None)",
        back_populates="collection",
        cascade="all, delete-orphan"
    )


class Folder(Base):
    """Optional grouping of requests inside a collection."""
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    collection = relationship("Collection", back_populates="folders")
    requests = relationship("Request", back_populates="folder", cascade="all, delete-orphan")


class Request(Base):
    """
    A saved HTTP request. Belongs to a collection, optionally inside a folder.

    body_type: none | raw | form-data | urlencoded
    auth_type: none | bearer | basic | api-key
    """
    __tablename__ = "requests"

    id = Column(Integer, primary_key=True, index=True)
    collection_id = Column(Integer, ForeignKey("collections.id"), nullable=False)
    folder_id = Column(Integer, ForeignKey("folders.id"), nullable=True)
    name = Column(String(200), nullable=False)
    method = Column(String(10), nullable=False, default="GET")
    url = Column(Text, nullable=False, default="")
    description = Column(Text, default="")

    # Body
    body_type = Column(String(20), default="none")   # none | raw | form-data | urlencoded
    body_content = Column(Text, default="")          # raw text or JSON string
    body_language = Column(String(20), default="json")  # json | text | xml | html

    # Auth
    auth_type = Column(String(20), default="none")   # none | bearer | basic | api-key
    auth_data = Column(JSON, default={})             # {token, username, password, key, value, in}

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    collection = relationship(
        "Collection",
        primaryjoin="Request.collection_id==Collection.id",
        back_populates="requests",
        foreign_keys="[Request.collection_id]"
    )
    folder = relationship("Folder", back_populates="requests")
    headers = relationship("Header", back_populates="request", cascade="all, delete-orphan")
    query_params = relationship("QueryParam", back_populates="request", cascade="all, delete-orphan")


class Header(Base):
    """Key-value HTTP headers for a saved request."""
    __tablename__ = "headers"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    key = Column(String(200), nullable=False)
    value = Column(Text, nullable=False, default="")
    description = Column(Text, default="")
    is_active = Column(Boolean, default=True)   # Toggle without deleting

    request = relationship("Request", back_populates="headers")


class QueryParam(Base):
    """Key-value URL query parameters for a saved request."""
    __tablename__ = "query_params"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=False)
    key = Column(String(200), nullable=False)
    value = Column(Text, nullable=False, default="")
    description = Column(Text, default="")
    is_active = Column(Boolean, default=True)

    request = relationship("Request", back_populates="query_params")


class Environment(Base):
    """
    A named set of variables (e.g. 'Production', 'Staging', 'Local').
    Variables are referenced as {{variable_name}} in requests.
    """
    __tablename__ = "environments"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    name = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    workspace = relationship("Workspace", back_populates="environments")
    variables = relationship("Variable", back_populates="environment", cascade="all, delete-orphan")


class Variable(Base):
    """A single {{key}} = value pair inside an environment."""
    __tablename__ = "variables"

    id = Column(Integer, primary_key=True, index=True)
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=False)
    key = Column(String(200), nullable=False)
    value = Column(Text, nullable=False, default="")
    is_secret = Column(Boolean, default=False)   # Mask in UI if true
    is_active = Column(Boolean, default=True)

    environment = relationship("Environment", back_populates="variables")


class History(Base):
    """
    Audit log of every HTTP send. Independent of saved requests —
    even unsaved/ad-hoc requests are logged here.
    """
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    # Optional link back to a saved request (null for ad-hoc sends)
    request_id = Column(Integer, ForeignKey("requests.id"), nullable=True)

    # What was sent
    method = Column(String(10), nullable=False)
    url = Column(Text, nullable=False)
    headers_snapshot = Column(JSON, default={})      # headers at time of send
    params_snapshot = Column(JSON, default={})       # query params at time of send
    body_type = Column(String(20), default="none")
    body_snapshot = Column(Text, default="")
    environment_id = Column(Integer, ForeignKey("environments.id"), nullable=True)
    environment_name = Column(String(200), default="")  # snapshot in case env is deleted

    # What came back
    status_code = Column(Integer, nullable=True)
    status_text = Column(String(50), default="")
    response_time_ms = Column(Float, nullable=True)    # milliseconds
    response_size_bytes = Column(Integer, nullable=True)
    response_headers = Column(JSON, default={})
    response_body = Column(Text, default="")

    # Meta
    executed_at = Column(DateTime, default=datetime.utcnow)
    is_error = Column(Boolean, default=False)       # network/timeout errors
    error_message = Column(Text, default="")
