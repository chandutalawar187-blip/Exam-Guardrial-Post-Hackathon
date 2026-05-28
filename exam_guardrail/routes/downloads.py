"""
Downloads route — redirects to GitHub Release assets for direct download.

Files are hosted on GitHub Releases (no size limit, always public).
The Supabase 'downloads' bucket has a 50 MB free-tier upload limit and
was never successfully populated, so downloads were always broken.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
import os

router = APIRouter(prefix="/api/downloads", tags=["downloads"])

# GitHub Release — files are here, verified working
GITHUB_REPO  = "chandutalawar187-blip/Exam-Guardrial-Post-Hackathon"
RELEASE_TAG  = os.getenv("AGENT_RELEASE_TAG", "v1.8.0")
_GITHUB_BASE = f"https://github.com/{GITHUB_REPO}/releases/download/{RELEASE_TAG}"

# Platform → filename mapping (matches what was uploaded to the GitHub release)
INSTALLERS = {
    "windows": "ExamGuardrailSetup.exe",
    "macos":   "ExamGuardrailSetup-macOS.dmg",
    "linux":   "ExamGuardrailSetup-Linux.deb",
}


@router.get("/{platform}")
async def download_installer(platform: str):
    """
    Direct download endpoint. Redirects to the GitHub Release asset.
    The browser will immediately start downloading the file.

    Usage:
      GET /api/downloads/windows  -> downloads .exe
      GET /api/downloads/macos    -> downloads .dmg
      GET /api/downloads/linux    -> downloads .deb
    """
    platform = platform.lower().strip()
    filename = INSTALLERS.get(platform)

    if not filename:
        raise HTTPException(
            status_code=404,
            detail=f"Unknown platform '{platform}'. Use: windows, macos, linux"
        )

    download_url = f"{_GITHUB_BASE}/{filename}"

    # 302 redirect so the browser downloads the file directly
    return RedirectResponse(url=download_url, status_code=302)


@router.get("/")
async def list_downloads():
    """Returns available downloads with their direct URLs."""
    return JSONResponse({
        "version": RELEASE_TAG,
        "downloads": {
            platform: {
                "filename": filename,
                "url":      f"{_GITHUB_BASE}/{filename}",
                "api_url":  f"/api/downloads/{platform}",
            }
            for platform, filename in INSTALLERS.items()
        }
    })
