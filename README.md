# Sub-Store Bot ☁️

Telegram Bot，远程 / 本地订阅一键转换，输出 **12 种客户端格式**。

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Linsars/sub-store-bot)

---

## 能干吗

- **远程订阅** — 发订阅链接，自动拉取，选格式出短链
- **本地订阅** — 发节点文本或文件，同个对话自动累计合并 + 去重
- **多订阅合并** — 一次性发多条 URL 或文件，自动合并去重
- **12 种输出格式** — Clash Meta / Mihomo、Quantumult X、Surge、Shadowrocket、sing-box、V2Ray、Loon、Stash、Surfboard、Egern、URI 列表、JSON
- **PV 级转换** — 820KB Sub-Store 引擎内置，精度同 [Sub-Store](https://github.com/sub-store-org/Sub-Store)
- **短链分享** — 转换结果保存到 KV，可复制/分享/下载

## 部署

点这个黄色按钮，授权 GitHub + Cloudflare，填 `BOT_TOKEN` 和 `ALLOWED_USERS` 就行：

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Linsars/sub-store-bot)

部署完成后：

1. 去 Cloudflare Dashboard → Workers → `sub-store-bot` 设置 `CLIP_URL` 为你的 Worker 域名（如 `https://xxx.workers.dev`）
2. 访问 `https://你的worker域名/webhook` 激活 Webhook
3. 在 Telegram 里发 `/start`

> ⚠️ **按钮需要 `wrangler.toml` 的 `kv_namespaces` 里不要写 `id` 字段**（包括 `id = ""`），否则按钮页面报"无法获取存储库内容"。

## 自动部署更新

设好以下 Secret 后，每次推代码到 `main` 自动更新 CF Worker：

| Secret | 哪里拿 |
|--------|--------|
| `CF_API_TOKEN` | Cloudflare Dashboard → 我的 API 令牌 → 创建令牌（Workers 编辑权限） |
| `CF_ACCOUNT_ID` | Cloudflare Dashboard → 右侧边栏 → 账户 ID |
| `BOT_TOKEN` | [@BotFather](https://t.me/BotFather) |
| `ALLOWED_USERS` | [@userinfobot](https://t.me/userinfobot) — 多个用逗号分隔 |
| `CLIP_URL` | 你的 Worker 域名。没设不影响，只是短链显示 ID 而非完整链接 |

> 没设的人 fork 了也能正常用一键按钮部署，自动跳过。

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `BOT_TOKEN` | Telegram Bot Token | ✅ |
| `ALLOWED_USERS` | 允许使用的用户 ID（逗号分隔），不设则全部开放 | ❌ |
| `CLIP_URL` | 短链基础 URL，如 `https://xxx.workers.dev` | ❌ |
| `CLOUDFLARE_API_TOKEN` | 部署用，CF Workers 编辑权限 | 仅部署 |
| `CF_ACCOUNT_ID` | 部署用 | 仅部署 |

## License

MIT
