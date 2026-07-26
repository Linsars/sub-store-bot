## v2.34.1 (2026-07-26)

- 去重统计修复：格式选择页显示原始节点数和去重数
- 删除短链后返回短链列表（而非主页）
- 清理死代码、调试日志
- HTTP 拉取失败显示具体错误信息

## v2.34.0 (2026-07-26)

- 节点名自动添加国家旗帜 emoji（基于关键词匹配）
- 30 个国家/地区支持（参考 sublink-worker 数据）
- 短英文词（HK/US/JP 等）自动加 `\b` 词边界，防止误匹配
- 别名按长度降序匹配，避免 "Indonesia" 被 "India" 截断
- 远程订阅和本地订阅输出均统一调用 addFlag
- 输出格式转换时统一加旗帜（不影响格式选择页显示）
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
