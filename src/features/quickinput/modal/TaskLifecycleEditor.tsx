/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton } from '@shared/ui/public';
import { getTaskStatusPresentation, type TaskLifecycleCommand, type TaskStatus } from '@core/records/public';

export interface TaskLifecycleEditorProps {
  status: TaskStatus;
  recurring: boolean;
  busy?: boolean;
  onCommand: (command: TaskLifecycleCommand) => void;
}

export function TaskLifecycleEditor({ status, recurring, busy = false, onCommand }: TaskLifecycleEditorProps) {
  const presentation = getTaskStatusPresentation(status);
  const canReopen = status !== 'open' && !recurring;
  return (
    <section className="think-quick-input-task-lifecycle" aria-label="任务状态">
      <div className="think-quick-input-task-lifecycle__header">
        <div className="think-quick-input-task-lifecycle__title">任务状态</div>
        <div className="think-quick-input-task-lifecycle__status">{presentation.emoji} {presentation.label}</div>
      </div>
      <div className="think-quick-input-task-lifecycle__help">状态变化走任务生命周期命令，不会被普通“保存修改”偷偷改写。</div>
      <div className="think-quick-input-task-lifecycle__actions">
        {status === 'open' ? (
          <>
            <ThinkButton type="button" size="sm" variant="primary" disabled={busy} onClick={() => onCommand('complete')}>✅ 完成任务</ThinkButton>
            {!recurring ? <ThinkButton type="button" size="sm" variant="danger" disabled={busy} onClick={() => onCommand('cancel')}>❌ 取消任务</ThinkButton> : null}
          </>
        ) : canReopen ? (
          <ThinkButton type="button" size="sm" variant="secondary" disabled={busy} onClick={() => onCommand('reopen')}>↩️ 重新打开</ThinkButton>
        ) : null}
      </div>
    </section>
  );
}
