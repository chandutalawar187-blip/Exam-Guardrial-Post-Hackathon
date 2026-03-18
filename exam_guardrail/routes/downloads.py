"""
Downloads route — serves installer files directly from Supabase Storage.
Students click "Download" on the website, and the file downloads instantly
without redirecting to GitHub or any external page.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
import os

router = APIRouter(prefix="/api/downloads", tags=["downloads"])

# Supabase Storage public URL pattern
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qwzkkywuhyqloszqmnjx.supabase.co")
BUCKET = "downloads"

# Platform → filename mapping
INSTALLERS = {
    "windows": "ExamGuardrailSetup.exe",
    "macos": "ExamGuardrailSetup-macOS.dmg",
    "linux": "ExamGuardrailSetup-Linux.deb",
}


@router.get("/{platform}")
async def download_installer(platform: str):
    """
    Direct download endpoint. Redirects to the Supabase Storage public URL.
    The browser will immediately start downloading the file.

    Usage:
      GET /api/downloads/windows  → downloads .exe
      GET /api/downloads/macos    → downloads .dmg
      GET /api/downloads/linux    → downloads .deb
    """
    platform = platform.lower().strip()
    filename = INSTALLERS.get(platform)

    if not filename:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown platform '{platform}'. Use: windows, macos, linux"
        )

    # Public Supabase Storage URL — no auth needed
    download_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{filename}"

    # 302 redirect so the browser downloads the file directly
    return RedirectResponse(url=download_url, status_code=302)


@router.get("/")
async def list_downloads():
    """Returns available downloads with their direct URLs."""
    base = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}"
    return {
        "downloads": {
            platform: {
                "filename": filename,
                "url": f"{base}/{filename}",
                "api_url": f"/api/downloads/{platform}",
            }
            for platform, filename in INSTALLERS.items()
        }
    }
