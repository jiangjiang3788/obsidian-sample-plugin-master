# 文档治理

Think OS 只允许一个实质文档根：`docs/`。项目根目录的 `README.md` 是导航入口，不承载版本过程文档；旧 `doc/` 已在 1.4.0 合并到 `docs/history/`，后续 Gate 禁止它重新出现。

## 当前事实

`docs/` 根层只保留少量仍然有效、会指导当前实现的文档：架构、Record/Field/Presentation 语义、测试发布、CSS 规范、UI 计划、开发护栏和本文档。新增长期规则应更新这些当前文档，而不是继续创建平级“最新版”文件。

版本实施资料统一放在：

- `docs/releases/<version>/PLAN.md`
- `docs/releases/<version>/IMPLEMENTATION_RESULT.md`
- `docs/releases/<version>/TEST_REPORT.md`

测试体系专题放 `docs/testing/`；仍需随源码携带的当前专题报告放 `docs/reports/`。

## 归档

历史材料全部进入 `docs/history/`，包括：

- 旧 Whiteboard implementation baseline / implementation result；
- 历史 PATCH README / file list；
- 已完成的迁移、交接、封版与临时安装说明；
- 不再作为当前事实的版本过程文档。

归档文件允许保留原文件名以便追溯，但不得被 Gate 或运行时代码当作当前产品接口。

## 历史与当前的边界

判断一份文档放哪里，只问一个问题：**它描述的是当前事实，还是历史过程？**

- 当前事实 → 更新现有 active doc，或放 `docs/releases/<current>/` 作为本次交付证据。
- 历史过程 → `docs/history/`。
- 不允许在项目根散落 `.md/.txt` 版本说明，也不允许恢复 `doc/`。

## Gate 合同

`docs-governance-gate` 必须保证：

1. 根 `README.md` 与核心 active docs 存在；
2. `doc/` 不存在；
3. 项目根除 `README.md` 外没有散落 Markdown 文档；
4. `docs/` 根层 active Markdown 数量受控；
5. 历史过程文档不回流到 active docs 根层。
