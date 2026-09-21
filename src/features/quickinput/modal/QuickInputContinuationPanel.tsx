/** @jsxImportSource preact */
import { ThinkButton } from '@shared/ui/public';
import { getRecordTypePresentation, normalizeRecordTypePresentationKey } from '@core/recordTypes/public';
import type { RecordContinuationFollowUp, RecordContinuationOption } from '@core/recordInput/public';

export interface QuickInputContinuationPanelProps {
  continuation: RecordContinuationFollowUp;
  onSelect: (option: RecordContinuationOption) => void;
  onFinish: () => void;
}

export function QuickInputContinuationPanel({
  continuation,
  onSelect,
  onFinish,
}: QuickInputContinuationPanelProps) {
  return (
    <section className="think-quick-input-continuation" aria-live="polite">
      <div className="think-quick-input-continuation__summary">
        <span className="think-quick-input-continuation__status">✅ 已记录</span>
        {continuation.goalPath ? (
          <span className="think-quick-input-continuation__context">基于：{continuation.goalPath}</span>
        ) : null}
      </div>
      <div className="think-quick-input-continuation__actions">
        <span className="think-quick-input-continuation__prompt">继续记录</span>
        <div className="think-quick-input-continuation__options" role="group" aria-label="继续记录类型">
          {continuation.options.map((option) => {
            const presentation = getRecordTypePresentation(option.recordTypeId);
            const recordType = normalizeRecordTypePresentationKey(option.recordTypeId);
            return (
              <button
                key={option.recordTypeId}
                type="button"
                className="think-quick-input-continuation__option think-record-type-action"
                data-record-type={recordType}
                title={`继续记录${option.label}`}
                onClick={() => onSelect(option)}
              >
                <span className="think-record-type-action__icon" aria-hidden="true">{presentation.icon}</span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        <ThinkButton
          className="think-quick-input-continuation__finish"
          size="sm"
          variant="secondary"
          onClick={onFinish}
        >完成</ThinkButton>
      </div>
    </section>
  );
}
