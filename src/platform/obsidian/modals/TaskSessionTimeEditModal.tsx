/** @jsxImportSource preact */
import { useMemo, useState } from 'preact/hooks';
import type { App } from 'obsidian';
import { Modal } from 'obsidian';
import { ModalHeader, ThinkButton, ThinkInput } from '@shared/ui/public';
import { prepareThinkModal, renderModalContent, unmountModalContent } from './modalPreact';

export interface TaskSessionTimeEditValue {
  time: string;
  endTime: string;
}

export interface TaskSessionTimeEditOptions {
  startedAt: string;
  endedAt: string;
  title?: string;
}

function localClock(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function clockDurationMinutes(start: string, end: string): number | null {
  const parse = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : null;
  };
  const startMinute = parse(start);
  const endMinute = parse(end);
  if (startMinute == null || endMinute == null) return null;
  return endMinute >= startMinute ? endMinute - startMinute : 1440 - startMinute + endMinute;
}


function SessionTimeForm(props: {
  options: TaskSessionTimeEditOptions;
  onSubmit: (value: TaskSessionTimeEditValue) => void;
  onCancel: () => void;
}) {
  const [startTime, setStartTime] = useState(localClock(props.options.startedAt));
  const [endTime, setEndTime] = useState(localClock(props.options.endedAt));
  const durationMinutes = useMemo(() => clockDurationMinutes(startTime, endTime), [startTime, endTime]);
  const canSubmit = /^\d{2}:\d{2}$/.test(startTime) && /^\d{2}:\d{2}$/.test(endTime) && durationMinutes != null && durationMinutes > 0;

  return (
    <div className="think-overlay-form think-session-time-editor">
      <ModalHeader left={<span>{props.options.title || '编辑实际执行时间'}</span>} onClose={props.onCancel} />
      <div className="think-overlay-body">
        <div className="think-field">
          <label className="think-field__label">实际开始</label>
          <ThinkInput type="time" value={startTime} onInput={(event) => setStartTime((event.currentTarget as HTMLInputElement).value)} />
        </div>
        <div className="think-field">
          <label className="think-field__label">实际结束</label>
          <ThinkInput type="time" value={endTime} onInput={(event) => setEndTime((event.currentTarget as HTMLInputElement).value)} />
        </div>
        <div className="think-field__description">实际时长：{durationMinutes == null ? '—' : `${durationMinutes} 分钟`}。结束时间早于开始时间时按跨午夜处理；实际时长必须大于 0。</div>
      </div>
      <div className="think-overlay-footer">
        <ThinkButton onClick={props.onCancel}>取消</ThinkButton>
        <ThinkButton variant="primary" disabled={!canSubmit} onClick={() => props.onSubmit({ time: startTime, endTime })}>保存实际时间</ThinkButton>
      </div>
    </div>
  );
}

export class TaskSessionTimeEditModal extends Modal {
  private resolvePromise: ((value: TaskSessionTimeEditValue | null) => void) | null = null;

  constructor(app: App, private readonly options: TaskSessionTimeEditOptions) {
    super(app);
  }

  openAndGetValue(): Promise<TaskSessionTimeEditValue | null> {
    return new Promise((resolve) => {
      this.resolvePromise = resolve;
      this.open();
    });
  }

  onOpen(): void {
    prepareThinkModal(this, 'think-modal-host--medium', 'think-session-time-edit-modal');
    renderModalContent(this.contentEl, (
      <SessionTimeForm
        options={this.options}
        onSubmit={(value) => {
          this.resolvePromise?.(value);
          this.resolvePromise = null;
          this.close();
        }}
        onCancel={() => {
          this.resolvePromise?.(null);
          this.resolvePromise = null;
          this.close();
        }}
      />
    ));
  }

  onClose() {
    this.resolvePromise?.(null);
    this.resolvePromise = null;
    unmountModalContent(this.contentEl);
  }
}
