refactor: 单人版收敛 MVP25，加入最终封版门禁与交付说明

本次提交为单人版破坏性收敛的最终封版。前面版本已经完成旧系统删除、输入链路模型化、主要视图逐个抽离、非 shared view 大容器收口和文档治理；本轮不继续拆小组件，而是补齐最终封版说明、最终门禁和最终验收入口。

主要改动：
- 新增 scripts/gates/final-convergence-gate.mjs
- 新增 npm run final-convergence:gate，并接入 npm run gate
- final-convergence gate 检查最终文档、收敛总览、验收清单、文档治理、核心 gate 链路和中文文件名
- 新增 docs/最终封版说明.md，记录封版结论、最终质量入口、不再强拆边界、文档维护规则和交付建议
- 新增 docs/单人版收敛-MVP25.md
- 新增 docs/Git提交备注-MVP25.md
- 更新 docs/README.md，将最终封版说明纳入当前阅读入口
- 更新 docs/单人版收敛总览.md，将 MVP25 作为最终封版阶段写入主线
- 更新 docs/MVP_ACCEPTANCE.md，补充 single-user convergence / final-convergence gate 验收要求
- 更新 docs/文档治理.md，补充封版后的文档维护边界
- 更新 scripts/gates/docs-governance-gate.mjs，要求 MVP25 文档和最终封版说明存在

防过度工程化说明：
- 本轮没有继续拆小组件
- 小型纯展示组件、底层交互 primitive 和职责清楚的组合面板不再为了形式统一拆 Model
- 后续只有出现明显计算、重复规则、状态派生、测试价值或大文件回流时，才继续抽离

验证：
- npm run final-convergence:gate 通过
- npm run docs-governance:gate 通过
- npm run single-user:gate 通过
- npm run shared-view-convergence:gate 通过
- npm run non-shared-view-convergence:gate 通过
- npm run gate 通过

本轮没有删除文件，因此交付为新增/修改文件补丁包，保留完整路径。

未完整运行 typecheck/build：当前环境没有 node_modules，缺少 node/preact/vite/client 类型定义。请本地执行 npm ci 后运行 typecheck、unit test、build 和 release build。
