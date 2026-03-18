"""
Upload installer files to Supabase Storage for direct download.
Run this after building a new installer to update the download page.

Usage:
    python upload_installers.py              # Upload all found installers
    python upload_installers.py --windows    # Upload only Windows
"""

import os
import sys
import httpx

# ── Config ──
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://qwzkkywuhyqloszqmnjx.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF3emtreXd1aHlxbG9zenFtbmp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMzODM4NjgsImV4cCI6MjA4ODk1OTg2OH0.zyuLqFALyFjRz76Ys1nnYmTHrTQH5UT06QyqmM6lGno")
BUCKET = "downloads"

# File mapping: local_path → storage_name
HERE = os.path.dirname(os.path.abspath(__file__))
INSTALLERS = {
    "windows": {
        "local": os.path.join(HERE, "agent_app", "ExamGuardrailSetup.exe"),
        "remote": "ExamGuardrailSetup.exe",
        "mime": "application/vnd.microsoft.portable-executable",
    },
    "macos": {
        "local": os.path.join(HERE, "agent_app", "dist", "ExamGuardrailSetup-macOS.dmg"),
        "remote": "ExamGuardrailSetup-macOS.dmg",
        "mime": "application/x-apple-diskimage",
    },
    "linux": {
        "local": os.path.join(HERE, "agent_app", "dist", "ExamGuardrailSetup-Linux.deb"),
        "remote": "ExamGuardrailSetup-Linux.deb",
        "mime": "application/vnd.debian.binary-package",
    },
}

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
}


def ensure_bucket():
    """Create the downloads bucket if it doesn't exist."""
    r = httpx.post(
        f"{SUPABASE_URL}/storage/v1/bucket",
        headers={**headers, "Content-Type": "application/json"},
        json={"id": BUCKET, "name": BUCKET, "public": True},
        timeout=30.0,
    )
    if r.status_code == 200:
        print(f"✅ Created bucket '{BUCKET}'")
    elif r.status_code == 409:
        print(f"✅ Bucket '{BUCKET}' already exists")
    else:
        print(f"⚠️ Bucket creation: {r.status_code} {r.text[:200]}")


def upload_file(platform: str, info: dict):
    """Upload a single installer file to Supabase Storage."""
    local_path = info["local"]
    remote_name = info["remote"]
    mime = info["mime"]

    if not os.path.exists(local_path):
        print(f"⏭️ Skipping {platform}: file not found at {local_path}")
        return False

    file_size = os.path.getsize(local_path)
    print(f"📦 Uploading {platform}: {remote_name} ({file_size / 1024 / 1024:.1f} MB)...")

    with open(local_path, "rb") as f:
        r = httpx.post(
            f"{SUPABASE_URL}/storage/v1/object/{BUCKET}/{remote_name}",
            headers={**headers, "Content-Type": mime, "x-upsert": "true"},
            content=f.read(),
            timeout=300.0,  # 5 min timeout for large files
        )

    if r.status_code in (200, 201):
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET}/{remote_name}"
        print(f"✅ Uploaded {platform}: {public_url}")
        return True
    else:
        print(f"❌ Failed {platform}: {r.status_code} {r.text[:200]}")
        return False


def main():
    platforms = sys.argv[1:] if len(sys.argv) > 1 else list(INSTALLERS.keys())
    platforms = [p.lstrip("-").lower() for p in platforms]

    print(f"\n{'='*50}")
    print(f"  ExamGuardrail Installer Upload")
    print(f"  Supabase: {SUPABASE_URL}")
    print(f"  Bucket: {BUCKET}")
    print(f"  Platforms: {', '.join(platforms)}")
    print(f"{'='*50}\n")

    ensure_bucket()
    print()

    success = 0
    for platform in platforms:
        info = INSTALLERS.get(platform)
        if not info:
            print(f"❌ Unknown platform: {platform}")
            continue
        if upload_file(platform, info):
            success += 1

    print(f"\n✅ Done! Uploaded {success}/{len(platforms)} installers.")
    print(f"📥 Download API: /api/downloads/windows, /api/downloads/macos, /api/downloads/linux")


if __name__ == "__main__":
    main()
