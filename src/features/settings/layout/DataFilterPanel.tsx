/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from '@shared/ui/public';
import { ExpandMoreIcon, FilterListIcon } from '@shared/ui/public';
import { DataStore } from '@core/services/public';
import { getAllFields } from '@core/types/public';
import { getFieldLabel } from '@core/fields/public';
import type { FilterRule, RecordViewItem } from '@core/types/public';
import { RuleBuilder } from '@features/settings/views/editors/RuleBuilder';
import { CommonFilterPanel } from '@features/settings/views/editors/CommonFilterPanel';

interface DataFilterPanelProps {
  dataStore: DataStore;
  filters: FilterRule[];
  items?: RecordViewItem[];
  onChange: (filters: FilterRule[]) => void;
}

function asDisplayList(value: any): string[] {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (value === null || value === undefined) return [];
  return String(value)
    .split(/[,，\n]/)
    .map(v => v.trim())
    .filter(Boolean);
}

function describeRule(rule: FilterRule): string {
  if (rule.op === 'empty') return `${getFieldLabel(rule.field)} 为空`;
  if (rule.op === 'notEmpty') return `${getFieldLabel(rule.field)} 非空`;
  if (rule.op === 'in' || rule.op === 'notIn') {
    const values = asDisplayList(rule.value);
    const opText = rule.op === 'in' ? '属于任一' : '不属于任一';
    return `${getFieldLabel(rule.field)} ${opText} ${values.join('、') || '未选择'}`;
  }
  if (rule.op === 'between') {
    const values = asDisplayList(rule.value);
    return `${getFieldLabel(rule.field)} 区间 ${values.join(' ~ ') || String(rule.value ?? '')}`;
  }
  return `${getFieldLabel(rule.field)} ${rule.op} ${String(rule.value ?? '')}`;
}

export function DataFilterPanel({
  dataStore,
  filters,
  items,
  onChange,
}: DataFilterPanelProps) {
  const [open, setOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const activeCount = filters.length;
  const sourceItems = items ?? dataStore.queryItems();
  const fieldOptions = useMemo(() => getAllFields(sourceItems), [sourceItems]);
  const commonFilterFields = useMemo(() => ['goalPath', 'goalId', 'coreBlock', 'themePath', 'baseCategory', 'status', 'cadence', 'priority', 'period'], []);
  const hasAdvancedFilters = useMemo(() => filters.some(rule => (
    rule.op !== 'in' || !commonFilterFields.includes(rule.field)
  )), [filters, commonFilterFields]);

  const handleOpen = () => {
    setAdvancedOpen(hasAdvancedFilters);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);
  const handleClear = () => onChange([]);
  const handleDeleteRule = (index: number) => {
    onChange(filters.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div class="tp-toolbar-data-filter">
      <Button
        size="small"
        variant={activeCount > 0 ? 'contained' : 'outlined'}
        startIcon={<FilterListIcon />}
        onClick={handleOpen}
        sx={{ textTransform: 'none' }}
      >
        数据筛选{activeCount > 0 ? ` (${activeCount})` : ''}
      </Button>

      {activeCount > 0 && (
        <div class="filter-popover-selected-chips">
          {filters.slice(0, 3).map((rule, index) => (
            <Chip
              key={`${rule.field}-${rule.op}-${index}`}
              label={describeRule(rule)}
              size="small"
              onDelete={() => handleDeleteRule(index)}
              sx={{ height: '20px', fontSize: '0.75rem' }}
            />
          ))}
          {filters.length > 3 && (
            <Chip label={`+${filters.length - 3}`} size="small" sx={{ height: '20px', fontSize: '0.75rem' }} />
          )}
        </div>
      )}

      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="lg"
        PaperProps={{
          sx: {
            width: 'min(1180px, calc(100vw - 32px))',
            maxWidth: 'calc(100vw - 32px)',
            height: 'min(760px, calc(100vh - 48px))',
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
            <div>
              <Typography variant="h6" component="div">全局数据筛选</Typography>
              <Typography variant="body2" color="text.secondary">
                这里的规则会作用于当前布局下的所有视图；单个视图自己的筛选仍在模块设置中维护。
              </Typography>
            </div>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
              <Chip label={`${fieldOptions.length} 个可筛选字段`} size="small" variant="outlined" />
              <Chip label={`${activeCount} 条规则`} size="small" color={activeCount > 0 ? 'primary' : 'default'} />
            </Box>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ p: 2.5, overflow: 'auto', background: 'var(--background-primary)' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <CommonFilterPanel
              title="常用筛选"
              description="先用目标、核心Block、主题等常用字段筛选：同一字段内多选表示“或”，不同字段之间默认表示“且”。"
              dataStore={dataStore}
              filters={filters}
              items={sourceItems}
              fieldOptions={fieldOptions}
              onChange={onChange}
            />

            <Accordion
              expanded={advancedOpen}
              onChange={(_, expanded: boolean) => setAdvancedOpen(expanded)}
              disableGutters
              elevation={0}
              sx={{
                border: 0,
                borderTop: '1px solid var(--background-modifier-border)',
                borderRadius: 0,
                background: 'transparent',
                boxShadow: 'none',
                '&:before': { display: 'none' },
                '& .MuiAccordionSummary-root': { px: 0, minHeight: '48px' },
                '& .MuiAccordionSummary-content': { my: 1 },
                '& .MuiAccordionDetails-root': { px: 0, pb: 0 },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>高级筛选规则</Typography>
                  <Chip label={`${activeCount} 条`} size="small" variant="outlined" />
                  <Typography variant="body2" color="text.secondary">
                    需要正则、区间、排除或复杂且/或关系时再展开
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <RuleBuilder
                  title="筛选"
                  mode="filter"
                  rows={filters}
                  fieldOptions={fieldOptions}
                  onChange={(rows) => onChange(rows as FilterRule[])}
                  dataStore={dataStore}
                  variant="panel"
                />
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 2.5, py: 1.5, justifyContent: 'space-between' }}>
          <Button size="small" onClick={handleClear} disabled={activeCount === 0}>清空全部规则</Button>
          <Button size="small" variant="contained" onClick={handleClose}>完成</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
