import os, json, requests

ACCOUNT = os.environ["CF_ACCOUNT_ID"]
TOKEN = os.environ["CF_API_TOKEN"]
NAME = os.getenv("CF_WORKER_NAME", "sub-store-bot")
BASE = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/scripts/{NAME}"

HEADERS = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# 1. 读取现有绑定（KV、环境变量等）
r = requests.get(f"{BASE}/settings", headers=HEADERS)
r.raise_for_status()
binds = r.json()["result"].get("bindings", [])

# 2. 构建 multipart
meta = json.dumps({
    "main_module": "worker.mjs",
    "bindings": binds
})
parts = (
    ('metadata', ('metadata.json', meta, 'application/json')),
    ('worker.mjs', ('worker.mjs', open('worker.mjs', 'rb'), 'application/javascript+module')),
    ('proxy-utils.esm.js', ('proxy-utils.esm.js', open('proxy-utils.esm.js', 'rb'), 'application/javascript+module')),
)

# 3. 上传
r = requests.put(f"{BASE}/content", headers=HEADERS, files=parts)
r.raise_for_status()
print("✅ Deployed:", r.json().get("success"))
