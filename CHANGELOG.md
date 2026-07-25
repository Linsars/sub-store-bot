## v2.33.0 (2026-07-25)

- parseClashYaml 支持 0 缩进 YAML（动态 indent）
- 新增 sing-box/Egern YAML 解析器
- Egern 输出转 proper YAML（不再输出 JSON-in-YAML）
- v2ray/URI 修复：`simple-obfs` → `obfs-local`，去掉多余 `/?`
- 修复阅后即焚短链状态不更新 + IP 未记录
- 移除 SS2022 侧链（全格式已支持）

## v2.32.1 (2026-07-25)

- parseClashYaml 支持 0 缩进节点（动态 indent 计算）
- 修复 proxy-groups 条目误解析

## v2.32.0 (2026-07-25)

- YAML 模板系统：从仓库 `landing/` 动态加载模板
- 新增 `LANDING_DIR` 变量，替代 `LANDING_HTML_URL`
- 模板管理：手动同步仓库按钮
- 更新日志功能
- 修复：cb_menu 清理 Gost 状态残留
- 修复：parseClashYaml 支持 2/4/8 空格缩进
- 修复：去重支持 anytls/tuic/juicity/hysteria/wireguard
- 删除死代码 parseTemplate

## v2.31.0 (2026-07-20)

- safeExecute 结构化错误处理
- 收集模式：URL + 文件多订阅合并
- Clash YAML 快速解析器

## v2.30.0 (2026-07-15)

- WireGuard 节点完整支持
- Gost 节点侧链输出
- 多格式输出：13 种 + Snell
