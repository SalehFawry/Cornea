"""Detect client-side FK violations from DB integrity errors."""

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

FK_VIOLATION_DETAIL = (
    "Foreign key violation: The referenced employee or branch does not exist."
)


def is_parent_key_fk_violation(exc: IntegrityError) -> bool:
    """True when the DB reports a foreign-key / parent-key-not-found style violation."""
    orig = getattr(exc, "orig", None)
    text = str(orig) if orig is not None else str(exc)
    if "ORA-02291" in text:
        return True
    pgcode = getattr(orig, "pgcode", None)
    if pgcode == "23503":
        return True
    if "FOREIGN KEY constraint failed" in text:
        return True
    return False


def maybe_raise_409_for_fk_violation(exc: IntegrityError) -> None:
    """If ``exc`` is a parent-key FK violation, raise HTTP 409; otherwise return (caller re-raises)."""
    if is_parent_key_fk_violation(exc):
        raise HTTPException(status_code=409, detail=FK_VIOLATION_DETAIL)
