import os, requests, json, sys

ACCOUNT = os.environ['CLOUDFLARE_ACCOUNT_ID']
TOKEN = os.environ['CLOUDFLARE_API_TOKEN']
BOT = os.environ.get('BOT_TOKEN', '8967815462:AAG-uP6YWT3HopQjO58mb4ZFrvaIiysS9gU')
NAME = sys.argv[1] if len(sys.argv) > 1 else os.environ.get('CF_WORKER_NAME', 'sub-store-bot1')
BASE = f'https://api.cloudflare.com/client/v4/accounts/{ACCOUNT}/workers/scripts/{NAME}'
KV_ID = '665b60772c2e464d9b76144d70c1fe94'
DIR = '/var/minis/workspace/substore-bot-package'

# 1. 部署代码 + 非 secret bindings
CLIP_URL = f'https://{NAME}.jidan666-919.workers.dev/'
meta = json.dumps({
    'main_module': 'worker.mjs',
    'bindings': [
        {'name': 'KV', 'type': 'kv_namespace', 'namespace_id': KV_ID},
        {'name': 'ALLOWED_USERS', 'type': 'plain_text', 'text': '5562061420'},
        {'name': 'CLIP_URL', 'type': 'plain_text', 'text': CLIP_URL},
    ]
})
files = (
    ('metadata', ('meta.json', meta, 'application/json')),
    ('worker.mjs', ('worker.mjs', open(f'{DIR}/worker.mjs', 'rb'), 'application/javascript+module')),
    ('proxy-utils.esm.js', ('proxy-utils.esm.js', open(f'{DIR}/proxy-utils.esm.js', 'rb'), 'application/javascript+module')),
)
r = requests.put(f'{BASE}/content', files=files, headers={'Authorization': f'Bearer {TOKEN}'})
if not r.json().get('success'):
    print('Deploy code FAILED:', json.dumps(r.json().get('errors', ''), indent=2)[:300])
    sys.exit(1)
print('Deploy code: OK')

# 2. 通过 Secrets API 设 BOT_TOKEN
r2 = requests.put(f'{BASE}/secrets', headers={
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json',
}, json={'name': 'BOT_TOKEN', 'text': BOT, 'type': 'secret_text'})
if r2.json().get('success'):
    print('Set BOT_TOKEN: OK')
else:
    print('Set BOT_TOKEN FAILED:', json.dumps(r2.json().get('errors', ''), indent=2)[:200])
