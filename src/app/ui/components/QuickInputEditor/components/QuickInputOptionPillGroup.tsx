/** @jsxImportSource preact */
import { h } from 'preact';

import { Box, Typography } from '@shared/public';

import { SelectablePill } from './SelectablePill';
import type { QuickInputChoice } from './quickInputOptionSelection';
import { isQuickInputChoiceSelected, toQuickInputOptionObject } from './quickInputOptionSelection';

export interface QuickInputOptionPillGroupProps {
  label: string;
  choices: QuickInputChoice[];
  value: unknown;
  onSelect: (value: { value: string; label: string }) => void;
  compact?: boolean;
}

export function QuickInputOptionPillGroup({
  label,
  choices,
  value,
  onSelect,
  compact = false,
}: QuickInputOptionPillGroupProps) {
  if (choices.length === 0) return null;

  const selectedChoice = choices.find((choice) => isQuickInputChoiceSelected(value, choice));

  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? 0.65 : 0.75,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {choices.map((choice) => {
          const selected = isQuickInputChoiceSelected(value, choice);
          return (
            <SelectablePill
              key={`${choice.value}-${choice.label}`}
              selected={selected}
              onClick={() => onSelect(toQuickInputOptionObject(choice))}
              title={choice.label}
              className="qi-selectable-pill--single"
            >
              {choice.label}
            </SelectablePill>
          );
        })}
      </Box>
      {selectedChoice && (
        <Typography
          variant="caption"
          sx={{
            color: 'text.secondary',
            lineHeight: 1.35,
            pl: 0.1,
          }}
        >
          当前：{selectedChoice.label}
        </Typography>
      )}
    </Box>
  );
}
