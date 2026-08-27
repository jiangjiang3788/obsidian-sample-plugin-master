# 测试体系 v3 变更记录

## 目标

把 v2 的“数据安全集成测试”继续推进到真实 Obsidian E2E，重点验证核心用户旅程与真实 Vault/插件运行时协作。

## 新增

- 真实插件生命周期 E2E；
- 设置 UI 创建/删除 Goal + 重启恢复；
- 四列 Goal Cascade 真机 UI；
- Quick Input 真机创建 Task + Vault/DataStore 双重验证 + 重启；
- VaultWatcher create/modify/delete 真机 E2E；
- 重建索引 + 重启；
- Timer 开始/暂停/重启/继续/停止 + TaskSession；
- Record 修改、时间、删除、路径迁移 + 重启；
- Energy 创建 + 重启；
- 循环任务 + TaskSeries + 重启；
- Goal Cascade 直接模板资格组合测试；
- E2E smoke/ui/runtime/p0 分组；
- E2E 执行前强制重新 build 当前插件。

## 总账变化

- v2：P0 40；完整 12；部分 28；缺失 0。
- v3：P0 40；完整 32；部分 8；缺失 0。

## 保留的真实缺口

不为了数字把以下能力假装成完整：

- 大 Vault 性能；
- Quick Input 冲突/失败恢复真机故障注入；
- 编辑已有 Record 的真实 UI 用户路径；
- Timer UI 操作；
- initializeCore 独立模块组合测试。
