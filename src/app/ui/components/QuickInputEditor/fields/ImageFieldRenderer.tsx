/** @jsxImportSource preact */
import { h } from 'preact';

import { normalizeImageValue } from '@core/fields/public';

import { QuickInputFieldFrame } from './FieldFrame';
import type { QuickInputFieldRendererBaseProps } from './types';
import { readInputValue, shouldSubmitPlainEnter } from './inputEvents';

interface ImageFieldRendererProps extends QuickInputFieldRendererBaseProps {
  getResourcePath: (path: string) => string;
}

function QuickInputImagePreview({ rawValue, getResourcePath }: { rawValue: unknown; getResourcePath: (path: string) => string }) {
  const image = normalizeImageValue(rawValue);
  if (!image) return null;
  const src = /^https?:\/\//i.test(image.src) ? image.src : getResourcePath(image.src);
  return (
    <div className="think-qif-image-preview">
      <img
        src={src}
        alt={image.alt || image.src}
        className="think-qif-image-preview__thumb"
      />
      <span className="think-qif-image-preview__src">{image.src}</span>
    </div>
  );
}

export function QuickInputImageFieldRenderer({
  field,
  value,
  onUpdate,
  onRequestSubmit,
  isMobileLike,
  getResourcePath,
}: ImageFieldRendererProps) {
  return (
    <QuickInputFieldFrame label={field.label || field.key} required={field.required}>
      <div>
        <input
          className="think-native-input"
          value={String(value || '')}
          onInput={(event) => onUpdate(field.key, readInputValue(event))}
          onKeyDown={(event) => {
            event.stopPropagation();
            if (shouldSubmitPlainEnter(event, isMobileLike)) {
              onRequestSubmit?.();
              event.preventDefault();
            }
          }}
          placeholder="图片路径、![[图片.png]] 或 URL"
        />
        <QuickInputImagePreview rawValue={value} getResourcePath={getResourcePath} />
      </div>
    </QuickInputFieldFrame>
  );
}
