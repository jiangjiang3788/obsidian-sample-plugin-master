/** @jsxImportSource preact */
import { normalizeRecordTypePresentationKey } from '@core/recordTypes/public';
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
        return (
          <SelectablePill
            key={recordType.id}
            selected={currentRecordTypeId === recordType.id}
            onClick={() => onRecordTypeChange(recordType.id)}
            title={label}
            className="think-quick-input-record-type-switcher__item"
          ><span className="think-record-type-marker" data-record-type={normalizeRecordTypePresentationKey(recordType.id)}>{label}</span></SelectablePill>
        );
      })}
    </div>
  );
}
