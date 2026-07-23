import os, json, requests

ACCOUNT = os.environ["CF_ACCOUNT_ID"]
TOKEN = os.environ["CF_API_TOKEN"]
NAME = os.getenv("CF_WORKER_NAME", "sub-store-bot")

BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/scripts/{NAME}"

meta = json.dumps({"main_module": "worker.mjs"})
parts = (
    ("metadata", ("metadata.json", meta, "application/json")),
    ("worker.mjs", ("worker.mjs", open("worker.mjs", "rb"), "application/javascript+module")),
    ("proxy-utils.esm.js", ("proxy-utils.esm.js", open("proxy-utils.esm.js", "rb"), "application/javascript+module")),
)

r = requests.put(f"{BASE}/content", files=parts, headers={"Authorization": f"Bearer {TOKEN}"})
result = r.json()
if not result.get("success"):
    print("FAILED:", json.dumps(result.get("errors", ""), indent=2)[:500])
    exit(1)
print("✅ Deployed:", result.get("success"))
