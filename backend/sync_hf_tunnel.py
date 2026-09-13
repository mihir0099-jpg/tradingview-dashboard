import sys
import time
import json
from huggingface_hub import HfApi

def sync_tunnel():
    if len(sys.argv) < 3:
        print("Usage: python sync_hf_tunnel.py <repo_id> <url>")
        sys.exit(1)

    repo_id = sys.argv[1].strip()
    url = sys.argv[2].strip().rstrip('/')

    try:
        api = HfApi()
        payload = json.dumps({
            "backendUrl": url,
            "updatedAt": int(time.time() * 1000)
        }, indent=2).encode("utf-8")

        api.upload_file(
            path_or_fileobj=payload,
            path_in_repo="live_backend.json",
            repo_id=repo_id,
            repo_type="space"
        )
        print(f"[HF Auto-Sync] Successfully published active tunnel to {repo_id}/live_backend.json: {url}")
    except Exception as e:
        print(f"[HF Auto-Sync Error] Failed to upload to {repo_id}: {e}")

if __name__ == "__main__":
    sync_tunnel()
