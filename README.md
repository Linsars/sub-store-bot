# Sub-Store Bot ☁️

Telegram Bot — 订阅转换 + 短链分享，内置完整 Sub-Store 引擎。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Linsars/sub-store-bot)

---

## 功能

- **远程订阅** — 发链接，自动 UA 轮询拉取，选格式出短链
- **本地订阅** — 发节点文本或文件，同对话自动累计合并 + 去重
- **多订阅合并** — 一次发多条 URL 或文件（内存累计，同实例内有效），自动合并去重
- **12 种输出格式** — Clash Meta、URI 标准链、JSON、V2Ray、sing-box、Surfboard、Quantumult X、Shadowrocket、Surge、Loon、Stash、Egern
- **WireGuard 双链输出** — WG 节点自动以 Clash Meta YAML 单独输出（字段最全），侧链按钮
- **Gost Tunnel 双链输出** — `socks://` Gost 节点保留原始格式单独输出，侧链按钮
- **PV 级转换** — 870KB Sub-Store 引擎内置，精度同 [Sub-Store](https://github.com/sub-store-org/Sub-Store)
- **短链管理** — 查看、删除、修改时效（永久 ↔ 限时互转）
- **单次转换时效** — 每次转换可单独设置短链有效期，不影响默认
- **UA 轮询可配置** — 主页管理轮询 UA 池：启用/禁用默认 UA、添加自定义 UA、恢复默认
- **自动去重** — 基于节点特征而非名称，合并来源不重复

## 按钮说明

| 按钮 | 功能 |
|------|------|
| 🌐 远程订阅 | 输入订阅 URL，自动拉取 |
| 📎 本地订阅 | 发送节点文本/文件 |
| 🌐 UA 轮询 | 配置订阅拉取用的 User-Agent 池 |
| ⏱ 有效期 | 设置默认短链时效 |
| 📋 我的短链 | 管理已生成的短链 |

**结果键盘布局：**
```
主链 | 分享          ← 主输出格式
⚡ WireGuard | 分享  ← 仅当有 WG 节点时（Clash Meta）
🔄 Gost | 分享       ← 仅当有 Gost 隧道时（原始格式）
主页
```

## 一键部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Linsars/sub-store-bot)

部署完成后：

1. 去 Cloudflare Dashboard → Workers → `sub-store-bot`，添加环境变量：
   - `BOT_TOKEN` — Telegram Bot Token（必填）
   - `CLIP_URL` — 你的 Worker 域名，如 `https://xxx.workers.dev`（必填，短链基础 URL）
   - `ALLOWED_USERS` — 允许使用的用户 ID，逗号分隔（可选，不设则全部开放）
2. 绑定 KV Namespace（绑定名 `KV`）
3. 访问 `https://你的worker域名/setup` 激活 Webhook（或用 `/webhook` 手动注册）
4. Telegram 里发 `/start`

> ⚠️ **一键按钮注意**：`wrangler.toml` 的 `kv_namespaces` 里不要写 `id` 字段（已配置好），否则按钮页面报错。

## GitHub Actions 自动部署

设好以下 Secrets，每次推 `main` 自动更新：

| Secret | 说明 |
|--------|------|
| `CF_API_TOKEN` | Cloudflare API Token（Worker 编辑权限） |
| `CF_ACCOUNT_ID` | Cloudflare 账户 ID |
| `BOT_TOKEN` | Telegram Bot Token |
| `CLIP_URL` | 短链域名，如 `https://xxx.workers.dev` |
| `ALLOWED_USERS` | 可选，用户 ID 逗号分隔 |

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `BOT_TOKEN` | Telegram Bot Token | ✅ |
| `CLIP_URL` | 短链基础 URL（如 `https://xxx.workers.dev`） | ✅ |
| `ALLOWED_USERS` | 允许的用户 ID（逗号分隔），不设则全部开放 | ❌ |
| `KV` | KV Namespace 绑定名 | ✅ |

## 手动部署

```bash
export CLOUDFLARE_API_TOKEN="your_token"
export BOT_TOKEN="your_bot_token"
export CLIP_URL="https://your-worker.workers.dev"
export KV_NAMESPACE_ID="your_kv_ns_id"
python3 deploy.py
```

## License

MIT
