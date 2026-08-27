# 测试体系 v4 变更记录

## P0 收口

- F001：新增 `initializeCore` 核心组合测试。
- F018：新增 20,000 条 RecordIndex 性能基线。
- F044：新增恢复面板 UI、恢复组合契约、真实 Obsidian 故障注入恢复。
- F045：新增真实 UI 编辑、回填、异常冲突恢复。
- F056：新增 Timer 悬浮窗暂停/继续/完成真实 UI。
- F120/F121/F123：新增 1,500 Markdown 文件 DataStore 扫描/查询/重建性能基线。

P0 功能测试地图从 v3 的 32 完整 / 8 部分，变为 v4 的 40 完整 / 0 部分。

## P1 第一批

- F077 AI Chat 会话存储：补 unit / integration / e2e / persistence / restart / error，达到维度完整。
- F091 Markdown 导出：补 unit / integration / error，保留 UI E2E 缺口。
- F132 大 Vault：补 integration / performance / regression，保留真实 Obsidian 大 Vault E2E。

## 新命令

- `npm run test:performance`
- `npm run test:p0:v4`
- `npm run verify:p0:v4`
- `npm run test:p1:v4`
- `npm run test:e2e:p1`
- `npm run verify:p1:v4`
