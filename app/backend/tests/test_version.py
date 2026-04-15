"""Tests for the /api/version endpoint."""

import pytest
from httpx import ASGITransport, AsyncClient

from backend.main import app


@pytest.mark.asyncio
async def test_version_returns_200():
    """GET /api/version returns 200 with a valid version field."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/version")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_version_is_non_empty_string():
    """The version field is a non-empty string."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/version")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["version"], str)
        assert len(data["version"]) > 0
