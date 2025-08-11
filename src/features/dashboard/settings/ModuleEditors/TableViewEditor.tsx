// src/features/dashboard/settings/ModuleEditors/TableViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, TextField, Autocomplete } from '@mui/material';
import type { ViewEditorProps } from './registry'; // 确保类型定义正确引入

/**
 * @fileoverview TableView 的设置编辑器。
 * 新增: 导出该视图的默认配置，作为单一真源。
 */

// [REFACTOR] 导出默认配置
export const DEFAULT_CONFIG = {
  view: 'TableView' as const,
  title: '表格视图',
  collapsed: false,
  filters: [],
  sort: [{ field: 'date', dir: 'desc' }],
  rowField: 'categoryKey',
  colField: 'date',
};

export function TableViewEditor({
  value, onChange, fieldOptions,
}: ViewEditorProps) {
  return (
    <div>
      <div class="view-meta" style="--c:#2b7fff">
        <span class="dot"></span>表格视图：仅“行/列字段”生效
      </div>
      <Stack direction="row" spacing={0.6}>
        <Autocomplete
          freeSolo disablePortal options={fieldOptions}
          value={value.rowField ?? ''}
          onChange={(_, v) => onChange({ rowField: v ?? '' })}
          renderInput={p => <TextField {...p} label="行字段" />}
          sx={{ flex: 1 }}
        />
        <Autocomplete
          freeSolo disablePortal options={fieldOptions}
          value={value.colField ?? ''}
          onChange={(_, v) => onChange({ colField: v ?? '' })}
          renderInput={p => <TextField {...p} label="列字段" />}
          sx={{ flex: 1 }}
        />
      </Stack>
    </div>
  );
}