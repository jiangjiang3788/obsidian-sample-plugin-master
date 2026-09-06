Think OS - 测试工作流恢复补丁

用途：
1. 恢复原项目 package.json 中的直接 Jest 测试入口。
2. 恢复原 jest.config.js / jest.unit.config.js / 中文 reporter。
3. 删除上一版新增的 run-unit-tests-zh wrapper、bootstrap preflight、Node/DOM 拆分配置和相关 gate。
4. 不修改 src/ 业务源码。
5. run-jest-zh.mjs 中缺依赖提示使用 npm install，不使用 npm ci。

使用：
- 将本压缩包内容解压到 obsidian-sample-plugin-master 项目根目录并覆盖同名文件。
- 然后双击或在 CMD 执行：APPLY_PATCH.cmd
- 日常测试恢复为：npm run 测试
- 单元测试：npm run 测试:单元
- 组合测试：npm run 测试:组合
- 完整测试：npm run 测试:完整
- 真机测试：npm run 测试:真机
- 发布测试：npm run 测试:发布

注意：
本补丁只恢复测试工作流，不处理当前 node_modules 中 source-map / symbol-tree 缺内部文件的问题。
