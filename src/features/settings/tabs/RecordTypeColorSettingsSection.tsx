/** @jsxImportSource preact */
import { h } from 'preact';
import {
  DEFAULT_RECORD_TYPE_COLOR_HEX,
  RECORD_TYPE_PRESENTATION_ORDER,
  getRecordTypePresentation,
  normalizeRecordTypeColorHex,
  type UserVisibleRecordType,
} from '@core/recordTypes/public';
import { selectRecordTypeColors, useSelector, useUseCases } from '@/app/public';
import { ThinkButton } from '@shared/ui/public';

function RecordTypeColorRow({ recordType }: { recordType: UserVisibleRecordType }) {
  const overrides = useSelector(selectRecordTypeColors);
  const useCases = useUseCases();
  const presentation = getRecordTypePresentation(recordType);
  const override = overrides[recordType];
  const effective = override ?? DEFAULT_RECORD_TYPE_COLOR_HEX[recordType];

  const commitText = async (input: HTMLInputElement) => {
    const normalized = normalizeRecordTypeColorHex(input.value);
    if (!normalized) {
      input.value = effective;
      return;
    }
    await useCases.settings.setRecordTypeColor(recordType, normalized);
  };

  return (
    <div className="think-settings-row think-settings-record-type-color-row" data-record-type={recordType}>
      <span className="think-settings-row__label">{presentation.label}</span>
      <div className="think-settings-row__body think-settings-record-type-color-row__controls">
        <input
          className="think-settings-record-type-color-row__picker"
          type="color"
          aria-label={`${presentation.label}颜色`}
          value={effective}
          onInput={(event) => useCases.settings.setRecordTypeColor(recordType, (event.currentTarget as HTMLInputElement).value)}
        />
        <input
          key={`${recordType}-${effective}`}
          className="think-input think-settings-record-type-color-row__hex"
          aria-label={`${presentation.label} 十六进制颜色值`}
          defaultValue={effective}
          spellcheck={false}
          onBlur={(event) => void commitText(event.currentTarget as HTMLInputElement)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') (event.currentTarget as HTMLInputElement).blur();
          }}
        />
        <ThinkButton
          variant="ghost"
          size="sm"
          disabled={!override}
          onClick={() => useCases.settings.setRecordTypeColor(recordType, null)}
        >
          恢复默认
        </ThinkButton>
      </div>
    </div>
  );
}

export function RecordTypeColorSettingsSection() {
  return (
    <section className="think-settings-section" data-settings-section="record-type-colors">
      <div className="think-settings-section__header">
        <h2 className="think-settings-section__title">记录类型颜色</h2>
        <p className="think-settings-section__description">固定 10 种用户记录类型；系统内部记录自动继承对应的用户类型颜色，不单独配置。</p>
      </div>
      <div className="think-settings-stack think-settings-stack--tight">
        {RECORD_TYPE_PRESENTATION_ORDER.map((recordType) => <RecordTypeColorRow key={recordType} recordType={recordType} />)}
      </div>
    </section>
  );
}
