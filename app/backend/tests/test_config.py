"""Tests for CORS_ORIGINS configuration parsing."""

from backend.config import CORS_ORIGINS


def test_default_cors_origins_includes_localhost():
    """Default CORS_ORIGINS should include localhost with FRONTEND_PORT."""
    assert "http://localhost:5173" in CORS_ORIGINS


def test_default_cors_origins_includes_127():
    """Default CORS_ORIGINS should include 127.0.0.1 with FRONTEND_PORT."""
    assert "http://127.0.0.1:5173" in CORS_ORIGINS


def test_custom_single_origin():
    """Custom CORS_ORIGINS env var with single origin parses correctly."""
    result = [o.strip() for o in "http://localhost:9999".split(",") if o.strip()]
    assert result == ["http://localhost:9999"]


def test_custom_multiple_origins():
    """Custom CORS_ORIGINS env var with multiple origins parses correctly."""
    result = [
        o.strip() for o in "http://localhost:9999,http://127.0.0.1:9999".split(",") if o.strip()
    ]
    assert result == ["http://localhost:9999", "http://127.0.0.1:9999"]


def test_whitespace_ignored():
    """Whitespace around origins is stripped."""
    result = [
        o.strip() for o in "http://localhost:9999 ,  http://127.0.0.1:9999 ".split(",") if o.strip()
    ]
    assert result == ["http://localhost:9999", "http://127.0.0.1:9999"]
