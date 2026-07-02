/** @jsxImportSource preact */
import { h } from 'preact';

import { isImageLikeValue, normalizeImageValue } from '@core/fields/public';

import { QuickInputFieldFrame } from './FieldFrame';
import type { QuickInputFieldRendererBaseProps } from './types';

interface RatingFieldRendererProps extends QuickInputFieldRendererBaseProps {
  getResourcePath: (path: string) => string;
}

function isRenderableImagePath(value: unknown): boolean {
  // normalizeImageValue 会把任意非空字符串包装成 unknown 图片；这里必须先判断是否真像图片。
  // 否则 Emoji 评分值（如 ♨️）会被当成图片 src，导致快捷输入面板按钮空白。
  return isImageLikeValue(value);
}

function readOptionField(option: unknown, key: 'label' | 'value'): unknown {
  return option && typeof option === 'object' ? (option as Record<string, unknown>)[key] : undefined;
}

export function QuickInputRatingFieldRenderer({
  field,
  rawValue,
  onUpdate,
  getResourcePath,
}: RatingFieldRendererProps) {
  const selectedRecord = rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)
    ? rawValue as Record<string, unknown>
    : null;
  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required}>
      <div className="think-qif-rating-row">
        {(field.options || []).map((option) => {
          const optionLabel = readOptionField(option, 'label');
          const optionValue = readOptionField(option, 'value');
          const isSelected = Boolean(selectedRecord && selectedRecord.label === optionLabel && selectedRecord.value === optionValue);
          const imageValue = isRenderableImagePath(optionValue) ? normalizeImageValue(optionValue) : undefined;
          const displayContent = imageValue ? (
            <img
              src={/^https?:\/\//i.test(imageValue.src) ? imageValue.src : getResourcePath(imageValue.src)}
              alt={String(optionLabel ?? '')}
              className="think-qif-rating-image"
            />
          ) : (
            <span className="think-qif-rating-text">{String(optionValue ?? '')}</span>
          );

          return (
            <button
              type="button"
              key={String(optionLabel ?? optionValue ?? '')}
              onClick={() => onUpdate(field.key, { value: optionValue, label: optionLabel }, true)}
              title={String(optionLabel || optionValue || '')}
              className={isSelected ? 'think-qif-rating-button is-selected' : 'think-qif-rating-button'}
            >
              {displayContent}
            </button>
          );
        })}
      </div>
    </QuickInputFieldFrame>
  );
}
