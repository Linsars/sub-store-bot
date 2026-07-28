## v2.35.0 (2026-07-28)

### 收集器 & 短链
- 收集器 KV 持久化：`_collected` / `_collectMode` 存入 KV，解决多 isolate 内存隔离
- 非收集模式确认框：发送文件/文本/链接弹确认框，确认后转短链
- 短链拉取：fetchSub 和多 URL 路径自动加 `?raw`
- 短链结果页：统一使用 `resultKb`（🔗 主链 + 📤 分享 + 🏠 主页）

### 本次时限 & 流量信息
- 新增「本次时限」菜单：临时覆盖时效/次数/流量信息，不影响主页默认值
- 流量信息模板选择：`cb_conv_flow_menu` + `cb_flow_pick`，选完回到本次时限菜单
- 流量信息持久化：`saveUserConfig` 合并写入，`loadUserConfig` 从 KV 自动重建
- `cb_flow_pick` 从模板选择进入时返回本次时限菜单（非格式选择页）

### YAML 解析器
- `parseClashYaml` 支持 alpn YAML 数组格式
- 嵌套对象支持数组值（`- item` 格式）
- 扩展 nestedKeys：覆盖 vless-opts/trojan-opts/shadowsocks-opts 等所有协议
- 新增字段：idle-session-*、udp-over-tcp、udp-relay-mode、ip-version 等

### 代码质量
- 统一 null 判空：`!= null` 替代混用的 `!== undefined` / `|| 0`
- 移除死代码：`cb_flow_toggle`、`cb_conv_back_flow`、`flow_toggle` 路由
- `saveUserConfig` 合并写入（只更新传入字段，保留旧值）

## v2.34.1 (2026-07-26)
