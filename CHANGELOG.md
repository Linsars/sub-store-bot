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
