"""
Variable resolution: replaces {{variable_name}} tokens with environment values.
"""

import re
from typing import Dict, Optional
from sqlalchemy.orm import Session
from models import Environment, Variable


def get_env_variables(db: Session, environment_id: Optional[int]) -> Dict[str, str]:
    """Load all active variables from an environment as a simple dict."""
    if not environment_id:
        return {}

    env = db.query(Environment).filter(Environment.id == environment_id).first()
    if not env:
        return {}

    return {
        var.key: var.value
        for var in env.variables
        if var.is_active
    }


def resolve(text: str, variables: Dict[str, str]) -> str:
    """
    Replace all {{key}} occurrences in text with their environment values.
    Unknown variables are left as-is.

    Example:
        resolve("https://{{base_url}}/users", {"base_url": "api.example.com"})
        → "https://api.example.com/users"
    """
    if not text or not variables:
        return text

    def replacer(match):
        key = match.group(1).strip()
        return variables.get(key, match.group(0))  # leave unknown vars unchanged

    return re.sub(r"\{\{([^}]+)\}\}", replacer, text)


def resolve_dict_values(d: Dict[str, str], variables: Dict[str, str]) -> Dict[str, str]:
    """Resolve variables in all values of a dict."""
    return {k: resolve(v, variables) for k, v in d.items()}
