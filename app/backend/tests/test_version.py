"""
Tests for the /api/version endpoint.
"""

from httpx import ASGITransport, AsyncClient

from backend.main import app


async def test_version_endpoint_returns_200():
    """GET /api/version returns 200 with a non-empty version field."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/version")

    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert isinstance(data["version"], str)
    assert len(data["version"]) > 0
