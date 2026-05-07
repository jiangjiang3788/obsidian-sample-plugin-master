# QuickInput 收口状态

## 当前状态

本轮修改已经进入收口阶段。主链路不建议继续大改。

## 已收口项目

- 任务正文读取
- task 模板识别 guard
- 时间默认值联动计算
- 主题三分法
- 任务写回保真 MVP
- 路径变化迁移保存
- partial_success 反馈
- 保存位置实时预览
- 预览与实际提交一致性校验

## 仍需手测确认

- 带双空格任务内容
- 带 override 模板 ID 的任务
- 时间 + 时长计算结束
- 修改主题后迁移保存
- 删除旧记录失败时的 partial_success
- 视图设置中的 rootTheme / leafTheme / themePath

## 暂不继续做

- 自动迁移失败后的自动回滚
- 大规模删除 legacy resolver
- 所有 block 类型完全 snapshot 化
- 更复杂的任务 token parser/serializer

## 下一轮再做

如果本轮手测稳定，下一轮可以考虑：

1. 自动迁移保存增加确认弹窗
2. 任务 token 级 patch serializer
3. block 编辑也完全切到 snapshot
4. 删除 legacy 主路径
