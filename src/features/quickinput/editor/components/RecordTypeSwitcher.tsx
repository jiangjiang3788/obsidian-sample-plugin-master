/** @jsxImportSource preact */
import { getRecordTypePresentation, normalizeRecordTypePresentationKey } from '@core/recordTypes/public';
import { SelectablePill } from './SelectablePill';

export interface RecordTypeSwitcherOption { id: string; name?: string }
export interface RecordTypeSwitcherProps {
  recordTypes: RecordTypeSwitcherOption[];
  currentRecordTypeId: string;
  onRecordTypeChange: (recordTypeId: string) => void;
}

export function RecordTypeSwitcher({ recordTypes, currentRecordTypeId, onRecordTypeChange }: RecordTypeSwitcherProps) {
  if (recordTypes.length <= 1) return null;
  return (
    <div className="think-quick-input-record-type-switcher" role="tablist" aria-label="记录类型">
      {recordTypes.map((recordType) => {
        const label = recordType.name || recordType.id;
        const presentation = getRecordTypePresentation(recordType.id);
        const presentationKey = normalizeRecordTypePresentationKey(recordType.id);
        return (
          <SelectablePill
            key={recordType.id}
            selected={currentRecordTypeId === recordType.id}
            onClick={() => onRecordTypeChange(recordType.id)}
            title={label}
            recordType={presentationKey}
            className="think-quick-input-record-type-switcher__item think-record-type-action"
          >
            <span className="think-record-type-action__icon" aria-hidden="true">{presentation.icon}</span>
            <span>{label}</span>
          </SelectablePill>
        );
      })}
    </div>
  );
}
