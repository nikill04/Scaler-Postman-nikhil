"""
Seed the database with sample data so the app is immediately usable.

Includes:
  - 1 default workspace
  - 2 collections (JSONPlaceholder, HTTPBin)
  - 2 environments (Production, Local)
  - Sample history entries
"""

from sqlalchemy.orm import Session
from models import (
    Workspace, Collection, Folder, Request,
    Header, QueryParam, Environment, Variable, History
)
from datetime import datetime, timedelta


def seed(db: Session):
    # Don't re-seed if data already exists
    if db.query(Workspace).count() > 0:
        return

    # ── Workspace ──────────────────────────────────────────────────────────
    workspace = Workspace(
        name="My Workspace",
        description="Default personal workspace"
    )
    db.add(workspace)
    db.flush()  # get the ID

    # ── Environments ───────────────────────────────────────────────────────
    prod_env = Environment(workspace_id=workspace.id, name="Production")
    local_env = Environment(workspace_id=workspace.id, name="Local Development")
    db.add_all([prod_env, local_env])
    db.flush()

    db.add_all([
        Variable(environment_id=prod_env.id, key="base_url", value="https://jsonplaceholder.typicode.com"),
        Variable(environment_id=prod_env.id, key="user_id", value="1"),
        Variable(environment_id=prod_env.id, key="api_key", value="prod-secret-key-123", is_secret=True),
        Variable(environment_id=local_env.id, key="base_url", value="http://localhost:3000"),
        Variable(environment_id=local_env.id, key="user_id", value="1"),
        Variable(environment_id=local_env.id, key="api_key", value="dev-test-key-456", is_secret=True),
    ])

    # ── Collection 1: JSONPlaceholder ──────────────────────────────────────
    col1 = Collection(
        workspace_id=workspace.id,
        name="JSONPlaceholder API",
        description="Sample requests for jsonplaceholder.typicode.com — a free fake REST API for testing."
    )
    db.add(col1)
    db.flush()

    # Folder inside col1
    folder1 = Folder(collection_id=col1.id, name="Posts")
    folder2 = Folder(collection_id=col1.id, name="Users")
    db.add_all([folder1, folder2])
    db.flush()

    # Requests in Posts folder
    req1 = Request(
        collection_id=col1.id, folder_id=folder1.id,
        name="Get All Posts",
        method="GET", url="https://jsonplaceholder.typicode.com/posts",
        description="Fetch all posts from the API",
        body_type="none", auth_type="none"
    )
    req2 = Request(
        collection_id=col1.id, folder_id=folder1.id,
        name="Get Post by ID",
        method="GET", url="https://jsonplaceholder.typicode.com/posts/1",
        description="Fetch a single post by its ID",
        body_type="none", auth_type="none"
    )
    req3 = Request(
        collection_id=col1.id, folder_id=folder1.id,
        name="Create Post",
        method="POST", url="https://jsonplaceholder.typicode.com/posts",
        description="Create a new post",
        body_type="raw", body_content='{\n  "title": "Hello World",\n  "body": "This is the post body.",\n  "userId": 1\n}',
        body_language="json", auth_type="none"
    )
    req4 = Request(
        collection_id=col1.id, folder_id=folder1.id,
        name="Update Post",
        method="PUT", url="https://jsonplaceholder.typicode.com/posts/1",
        description="Update an existing post",
        body_type="raw", body_content='{\n  "id": 1,\n  "title": "Updated Title",\n  "body": "Updated body text.",\n  "userId": 1\n}',
        body_language="json", auth_type="none"
    )
    req5 = Request(
        collection_id=col1.id, folder_id=folder1.id,
        name="Delete Post",
        method="DELETE", url="https://jsonplaceholder.typicode.com/posts/1",
        description="Delete a post by ID",
        body_type="none", auth_type="none"
    )
    # Requests in Users folder
    req6 = Request(
        collection_id=col1.id, folder_id=folder2.id,
        name="Get All Users",
        method="GET", url="https://jsonplaceholder.typicode.com/users",
        description="Fetch all users",
        body_type="none", auth_type="none"
    )
    req7 = Request(
        collection_id=col1.id, folder_id=folder2.id,
        name="Get User by ID",
        method="GET", url="https://jsonplaceholder.typicode.com/users/{{user_id}}",
        description="Uses {{user_id}} environment variable",
        body_type="none", auth_type="none"
    )
    db.add_all([req1, req2, req3, req4, req5, req6, req7])
    db.flush()

    # Headers for req3 (Create Post)
    db.add(Header(request_id=req3.id, key="Content-Type", value="application/json", is_active=True))

    # ── Collection 2: HTTPBin ──────────────────────────────────────────────
    col2 = Collection(
        workspace_id=workspace.id,
        name="HTTPBin Test Suite",
        description="Test various HTTP scenarios using httpbin.org"
    )
    db.add(col2)
    db.flush()

    bin_req1 = Request(
        collection_id=col2.id,
        name="Echo GET Request",
        method="GET", url="https://httpbin.org/get",
        description="Returns the GET request details",
        body_type="none", auth_type="none"
    )
    bin_req2 = Request(
        collection_id=col2.id,
        name="POST JSON Body",
        method="POST", url="https://httpbin.org/post",
        description="Echo back a JSON body",
        body_type="raw", body_content='{\n  "name": "Nikhil",\n  "role": "SDE Intern"\n}',
        body_language="json", auth_type="none"
    )
    bin_req3 = Request(
        collection_id=col2.id,
        name="Bearer Token Auth",
        method="GET", url="https://httpbin.org/bearer",
        description="Test bearer token authorization",
        body_type="none", auth_type="bearer",
        auth_data={"token": "my-test-token-123"}
    )
    bin_req4 = Request(
        collection_id=col2.id,
        name="Response Status Codes",
        method="GET", url="https://httpbin.org/status/200",
        description="Test different HTTP status codes — change 200 to 404, 500, etc.",
        body_type="none", auth_type="none"
    )
    bin_req5 = Request(
        collection_id=col2.id,
        name="Delay Response (2s)",
        method="GET", url="https://httpbin.org/delay/2",
        description="Test timeout handling — response is delayed by 2 seconds",
        body_type="none", auth_type="none"
    )
    db.add_all([bin_req1, bin_req2, bin_req3, bin_req4, bin_req5])
    db.flush()

    # Query params for bin_req1
    db.add(QueryParam(request_id=bin_req1.id, key="format", value="json", is_active=True))
    db.add(QueryParam(request_id=bin_req1.id, key="source", value="postman-clone", is_active=True))

    # Header for bin_req2
    db.add(Header(request_id=bin_req2.id, key="Content-Type", value="application/json", is_active=True))
    db.add(Header(request_id=bin_req2.id, key="X-Custom-Header", value="hello-world", is_active=True))

    # ── Seed History ───────────────────────────────────────────────────────
    now = datetime.utcnow()
    db.add_all([
        History(
            request_id=req1.id, method="GET",
            url="https://jsonplaceholder.typicode.com/posts",
            headers_snapshot={}, params_snapshot={},
            body_type="none", body_snapshot="",
            status_code=200, status_text="OK",
            response_time_ms=142.5, response_size_bytes=27990,
            response_headers={"Content-Type": "application/json; charset=utf-8"},
            response_body='[{"userId":1,"id":1,"title":"sunt aut facere..."}]',
            executed_at=now - timedelta(minutes=5),
        ),
        History(
            request_id=req3.id, method="POST",
            url="https://jsonplaceholder.typicode.com/posts",
            headers_snapshot={"Content-Type": "application/json"}, params_snapshot={},
            body_type="raw", body_snapshot='{"title":"Hello World","body":"Test","userId":1}',
            status_code=201, status_text="Created",
            response_time_ms=89.3, response_size_bytes=65,
            response_headers={"Content-Type": "application/json; charset=utf-8"},
            response_body='{"title":"Hello World","body":"Test","userId":1,"id":101}',
            executed_at=now - timedelta(minutes=3),
        ),
        History(
            request_id=bin_req1.id, method="GET",
            url="https://httpbin.org/get",
            headers_snapshot={}, params_snapshot={"format": "json"},
            body_type="none", body_snapshot="",
            status_code=200, status_text="OK",
            response_time_ms=310.7, response_size_bytes=412,
            response_headers={"Content-Type": "application/json"},
            response_body='{"args":{"format":"json"},"headers":{},"url":"https://httpbin.org/get"}',
            executed_at=now - timedelta(minutes=1),
        ),
    ])

    db.commit()
    print("✅ Database seeded with sample data")
