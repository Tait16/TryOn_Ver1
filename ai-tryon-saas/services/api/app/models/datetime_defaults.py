"""Client-side timestamps for SQLite tables created without server DEFAULT."""

from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)
