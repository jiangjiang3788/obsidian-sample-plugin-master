# 开发护栏

1. **先提出一条具体用户问题**，再定位模块；一个改动只解决一个可验证目标。
2. `src/` 的改动尽量配套 `test/unit` 或 `test/integration` 用例；修复缺陷先建立失败回归测试。
3. 不直接用真实私人笔记库跑自动测试、迁移或故障注入；创建专用 Vault。
4. 不把 token、API Key、个人数据、`data.json`、诊断日志、`node_modules/` 提交到源码。
5. 永远保留 `package-lock.json`，使用 `npm ci` 锁定依赖；升级依赖单独审计。
6. 改存储前准备备份、失败恢复、重启持久化与迁移覆盖。
7. 修改后：`npm test` → `npm run check` → `npm run build`；Vika 上传前在测试 Vault 完成验收。
8. 允许按需运行细粒度 `scripts/`，但不要擅自跳过质量门禁或手动执行发布脚本。
