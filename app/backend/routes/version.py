"""Version endpoint routes."""

from importlib.metadata import version

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class VersionResponse(BaseModel):
    version: str


@router.get("/version", response_model=VersionResponse)
async def get_version() -> VersionResponse:
    """
    Return the installed package version for the backend.

    The version is read from the dynachat-backend package metadata.
    Falls back to "0.1.0" if the metadata lookup fails.
    """
    try:
        ver = version("dynachat-backend")
    except Exception:
        ver = "0.1.0"
    return VersionResponse(version=ver)
