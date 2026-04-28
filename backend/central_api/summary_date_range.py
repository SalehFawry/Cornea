"""Resolve optional ``date_from`` / ``date_to`` for summary endpoints."""

from datetime import date, timedelta

from fastapi import HTTPException

_DEFAULT_DAYS = 30


def resolve_summary_dates(
    date_from: date | None,
    date_to: date | None,
) -> tuple[date, date]:
    """Return inclusive bounds. Missing ``date_to`` defaults to today; missing ``date_from``
    defaults to 30 calendar days before ``date_to`` (after ``date_to`` is resolved).
    """
    resolved_to = date_to if date_to is not None else date.today()
    resolved_from = (
        date_from
        if date_from is not None
        else resolved_to - timedelta(days=_DEFAULT_DAYS)
    )
    if resolved_from > resolved_to:
        raise HTTPException(
            status_code=400,
            detail="date_from must be on or before date_to.",
        )
    return resolved_from, resolved_to
