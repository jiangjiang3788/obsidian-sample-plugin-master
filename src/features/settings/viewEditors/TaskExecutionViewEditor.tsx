/** @jsxImportSource preact */
import { h } from 'preact';
import type { ViewEditorProps } from './registry';
import { TASK_EXECUTION_VIEW_DEFAULT_CONFIG } from '@core/public';
import { ReadonlyViewEditorNotice } from './settingsEditorUi';

export { TASK_EXECUTION_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';

export function TaskExecutionViewEditor(_props: ViewEditorProps) {
  return (
    <ReadonlyViewEditorNotice
      title="任务执行视图"
      description="按主题两级分组展示带 🔁 的未完成任务；左键记录一次，右键查看当前时间范围内的完成记录，并可跳转到原位置。"
    />
  );
}
