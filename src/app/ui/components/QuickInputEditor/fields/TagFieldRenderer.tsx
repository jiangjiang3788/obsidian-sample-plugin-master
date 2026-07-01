/** @jsxImportSource preact */
import { h } from 'preact';

import { Box } from '@shared/ui/public';
import { templateFieldValueToArray } from '@core/fields/public';
import { normalizeQuickInputChoices } from '../components/quickInputOptionSelection';

import { QuickInputFieldFrame } from './FieldFrame';
import type { QuickInputFieldRendererBaseProps } from './types';
import { isComposingKeyboardEvent, readInputValue } from './inputEvents';

interface TagFieldRendererProps extends QuickInputFieldRendererBaseProps {
  tagDrafts: Record<string, string>;
  onTagDraftsChange: (drafts: Record<string, string>) => void;
}

function selectedValues(value: unknown): string[] {
  return Array.from(new Set(templateFieldValueToArray(value)));
}

export function QuickInputTagFieldRenderer({
  field,
  rawValue,
  tagDrafts,
  onTagDraftsChange,
  onUpdate,
  onRequestSubmit,
  isMobileLike,
}: TagFieldRendererProps) {
  const selected = selectedValues(rawValue);
  const selectedSet = new Set(selected);
  const choices = normalizeQuickInputChoices(field.options)
    .filter((choice) => !selectedSet.has(choice.value) && !selectedSet.has(choice.label))
    .slice(0, 12);
  const inputValue = tagDrafts[field.key] ?? '';
  const label = field.label || field.key;

  const setDraft = (nextValue: string) => onTagDraftsChange({ ...tagDrafts, [field.key]: nextValue });
  const commitDraft = (rawDraft?: unknown) => {
    const draft = rawDraft ?? tagDrafts[field.key] ?? '';
    const additions = templateFieldValueToArray(draft);
    if (!additions.length) return;
    onUpdate(field.key, Array.from(new Set([...selected, ...additions])));
    setDraft('');
  };

  return (
    <QuickInputFieldFrame label={label} required={field.required}>
      <Box className="think-ob-tag-editor">
        <Box className="think-ob-tag-editor__row">
          {selected.map((item) => (
            <button
              key={`${field.key}-${item}`}
              type="button"
              className="think-ob-tag-pill is-selected"
              title={`移除 ${item}`}
              onClick={() => onUpdate(field.key, selected.filter((value) => value !== item))}
            >
              <span>{item}</span>
              <span aria-hidden="true" className="think-ob-tag-pill__remove">×</span>
            </button>
          ))}
          <input
            className="think-ob-tag-input"
            value={inputValue}
            onInput={(event) => {
              const nextValue = readInputValue(event);
              if (/[,，\n]/.test(nextValue)) {
                commitDraft(nextValue);
                return;
              }
              setDraft(nextValue);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              if (isComposingKeyboardEvent(event)) return;
              if (event.key === 'Enter' || event.key === 'Tab') {
                if (inputValue.trim()) {
                  commitDraft(inputValue);
                  event.preventDefault();
                  return;
                }
                if (!isMobileLike && event.key === 'Enter' && !event.metaKey && !event.ctrlKey && !event.shiftKey) {
                  onRequestSubmit?.();
                  event.preventDefault();
                }
              }
              if ((event.key === 'Backspace' || event.key === 'Delete') && !inputValue && selected.length) {
                onUpdate(field.key, selected.slice(0, -1));
              }
            }}
            placeholder={selected.length ? '添加...' : `输入${label}，回车添加`}
          />
        </Box>
        {choices.length > 0 && (
          <Box className="think-ob-tag-suggestions">
            {choices.map((choice) => (
              <button
                key={`${field.key}-${choice.value}-${choice.label}`}
                type="button"
                className="think-ob-tag-pill"
                onClick={() => onUpdate(field.key, Array.from(new Set([...selected, choice.value])))}
                title={choice.label}
              >
                {choice.label}
              </button>
            ))}
          </Box>
        )}
      </Box>
    </QuickInputFieldFrame>
  );
}
