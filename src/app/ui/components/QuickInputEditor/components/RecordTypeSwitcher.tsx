/** @jsxImportSource preact */
import { h } from 'preact';

import { FormControl } from '@shared/ui/public';

import { SelectablePill } from './SelectablePill';

export interface RecordTypeSwitcherOption {
  id: string;
  name?: string;
}

export interface RecordTypeSwitcherProps {
  blocks: RecordTypeSwitcherOption[];
  currentBlockId: string;
  onBlockChange: (blockId: string) => void;
}

export function RecordTypeSwitcher({
  blocks,
  currentBlockId,
  onBlockChange,
}: RecordTypeSwitcherProps) {
  if (blocks.length <= 1) return null;

  return (
    <FormControl fullWidth>
      <div class="think-quick-input-record-type-switcher" role="tablist" aria-label="记录类型">
        {blocks.map((block) => {
          const selected = currentBlockId === block.id;
          const label = block.name || block.id;
          return (
            <SelectablePill
              key={block.id}
              selected={selected}
              onClick={() => onBlockChange(block.id)}
              title={label}
              className="think-quick-input-record-type-switcher__item"
            >
              {label}
            </SelectablePill>
          );
        })}
      </div>
    </FormControl>
  );
}
