## v2.36.17 (2026-08-09)

- 测活输出:通用判定(私网判死 / Cloudflare IP 保留 / 真实 TCP 探测),cron 队列,每批 30 个提速
- 拉取进度条:单订阅 UA 尝试进度 / 多订阅逐 URL 状态
- 订阅解析:新增 Surge 配置、sing-box 官方 JSON 格式支持
- 私有 DNS 注入修复(psn 位置偏移)
- 自定义 YAML 模板:__ALL_NODES__ 占位符,provider 架构模板自动内联节点
- 短链域名默认使用 worker 自身域名(CLIP_URL 可选),/webhookbot 一键激活

## v2.35.2 (2026-08-03)

- 修复:PROXY_URL 拼接自动补 `url=` 前缀,兼容尾部无 `url=` 的配置
- 修复:反代拉取时标注 `反代(Karing)`,便于区分直连/反代路径
- 文档:PROXY_URL 配置说明简化,不再要求手动拼 `&` 或 `url=`

## v2.35.1 (2026-08-01)

- 修复：2-3 个订阅一起拉取时失败（多 URL 分支缺失，`>= 4` 改为 `>= 2`）
- 修复：订阅拉取全部失败（worker 加 nodejs_compat flag，ProxyUtils.parse 解析 Clash YAML 正常）
- 部署：开启 nodejs_compat 兼容 flag（proxy-utils 依赖 Buffer/require("util")）

## v2.35.0 (2026-07-28)


- 本次时限菜单：临时覆盖时效/次数/流量信息，不改变主页默认值
- 并行拉取：4+ URL 改为批量并行 fetch（10 个一批，5s 超时）
- 流量信息模板选择：从本次时限菜单进入，选完自动返回
- 流量信息持久化：模板选择 / 读取 / 合并写入修复
- 非收集器短链结果页：统一使用 resultKb（主链+分享+主页）
- parseClashYaml：支持 alpn YAML 数组 + 嵌套对象数组
- saveUserConfig：合并写入，只更新传入字段
- 统一 null 判空（`!= null` 替代混用）
- 移除死代码（flow_toggle / conv_back_flow）

## v2.34.1 (2026-07-26)
