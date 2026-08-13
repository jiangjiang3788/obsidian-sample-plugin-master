/** @jsxImportSource preact */
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

import { Box, Button, Chip, Popover, Typography } from '../muiCompat';
import { ThinkIcon } from '../primitives/Icon';
import { ThinkButton } from '../primitives/Button';

export interface FilterPopoverProps {
  label: string;
  popoverTitle: string;
  selectedKeys: string[];
  totalCount: number;
  getChipLabel: (key: string) => string;
  onDeleteKey: (key: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  emptyText?: string;
  isEmpty?: boolean;
  chipLimit?: number;
  children?: ComponentChildren;
}

export function FilterPopover({
  label,
  popoverTitle,
  selectedKeys,
  totalCount,
  getChipLabel,
  onDeleteKey,
  onSelectAll,
  onClearAll,
  emptyText = '暂无数据',
  isEmpty = false,
  chipLimit = 3,
  children,
}: FilterPopoverProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);
  const selectedCount = selectedKeys.length;

  const handleClick = (event: any) => setAnchorEl((event?.currentTarget ?? null) as HTMLElement | null);
  const handleClose = () => setAnchorEl(null);

  const showPartial = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div className="think-filter-popover">
      <ThinkButton
        size="sm"
        variant="secondary"
        aria-pressed={showPartial}
        leadingIcon={<ThinkIcon name="filter" />}
        onClick={handleClick}
      >
        {label} {showPartial && `(${selectedCount}/${totalCount})`}
      </ThinkButton>

      {showPartial && (
        <div className="think-filter-popover__selected-chips">
          {selectedKeys.slice(0, chipLimit).map((key) => (
            <Chip
              key={key}
              label={getChipLabel(key)}
              size="small"
              onDelete={() => onDeleteKey(key)}
              sx={{ height: '20px', fontSize: '0.75rem' }}
            />
          ))}
          {selectedKeys.length > chipLimit && (
            <Chip label={`+${selectedKeys.length - chipLimit}`} size="small" sx={{ height: '20px', fontSize: '0.75rem' }} />
          )}
        </div>
      )}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Box sx={{ p: 2, minWidth: '250px', maxWidth: '400px', maxHeight: '500px', overflowY: 'auto' }}>
          <Typography variant="subtitle2" gutterBottom>
            {popoverTitle}
          </Typography>

          <Box sx={{ mb: 1, display: 'flex', gap: 1 }}>
            <Button size="small" onClick={onSelectAll}>
              全选
            </Button>
            <Button size="small" onClick={onClearAll}>
              清空
            </Button>
          </Box>

          {isEmpty ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              {emptyText}
            </Typography>
          ) : (
            children
          )}
        </Box>
      </Popover>
    </div>
  );
}
