refactor: 单人版收敛 MVP26，建立 any 预算门禁与安全读取工具

本次提交在 MVP25 最终封版后转入类型治理第一刀。不继续拆视图，不做大范围业务重构，而是先建立显式 any 的可度量基线、预算门禁和动态输入安全读取工具，为后续逐版降低类型债提供基础。

主要改动：
- 新增 scripts/gates/any-budget-gate.mjs
- 新增 npm run any-budget:gate，并接入 npm run gate
- any-budget gate 会统计 src/test/scripts 的显式 any、as any、: any，并输出 top files
- MVP26 基线为 src 1087、test 164、scripts 2、总计 1253、as any 583、: any 555
- 新增 src/core/utils/unknownRecord.ts
- unknownRecord 提供 isUnknownRecord、asUnknownRecord、readString、readTrimmedString、readNumber、readBoolean、readStringArray、readRecord、readRecordArray、readFirstString
- 更新 src/core/utils/index.ts，对外导出 unknownRecord 工具
- 新增 test/unit/unknownRecord.test.ts，覆盖动态输入安全读取基础场景
- 新增 docs/类型治理计划.md，记录 any 基线、治理原则、允许暂缓边界和后续优先级
- 更新 docs/README.md、docs/文档治理.md、docs/单人版收敛总览.md、docs/MVP_ACCEPTANCE.md，加入类型治理入口和 any-budget gate
- 更新 docs-governance / final-convergence gate，要求类型治理入口存在，并允许 MVP26 文档后的 docs 根目录数量上限

防过度工程化说明：
- 本轮没有把所有 any 机械替换为 unknown
- 本轮没有大面积重写业务文件
- 动态边界先建立 decoder/helper，后续再逐步替换核心模型层 any
- 后续每一轮应降低 any 预算，而不是只改文字

验证：
- npm run any-budget:gate 通过
- npm run docs-governance:gate 通过
- npm run final-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行新增单测、typecheck 和 build。
