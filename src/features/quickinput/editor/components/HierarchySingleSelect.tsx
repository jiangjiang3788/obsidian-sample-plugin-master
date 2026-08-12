/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import { getLeafPath, normalizePath } from '@core/utils/public';
import { Box, Typography } from '@shared/ui/public';

import { SelectablePill } from './SelectablePill';

export interface HierarchySingleSelectOption {
  id: string;
  value: string;
  label?: string;
  icon?: string;
  order?: number;
  synthetic?: boolean;
}

export interface HierarchySingleSelectProps {
  options: HierarchySingleSelectOption[];
  selectedValue?: string | null;
  onSelect: (option: HierarchySingleSelectOption | null) => void;
  parentLabel?: string;
  childLabel?: string;
  emptyLabel?: string;
  dense?: boolean;
  allowClear?: boolean;
  searchable?: boolean;
}


function cleanLabel(value: string): string {
  return String(value || '').trim();
}

function leafLabel(path: string): string {
  return cleanLabel(getLeafPath(path) || path);
}

function getOrder(option: HierarchySingleSelectOption): number {
  return typeof option.order === 'number' && Number.isFinite(option.order) ? option.order : Number.MAX_SAFE_INTEGER;
}

function compareOption(a: HierarchySingleSelectOption, b: HierarchySingleSelectOption): number {
  const byOrder = getOrder(a) - getOrder(b);
  if (byOrder !== 0) return byOrder;
  return (a.label || leafLabel(a.value)).localeCompare(b.label || leafLabel(b.value), 'zh-Hans-CN');
}

function buildTree(options: HierarchySingleSelectOption[]) {
  const byValue = new Map<string, HierarchySingleSelectOption>();
  const childrenByParent = new Map<string, HierarchySingleSelectOption[]>();

  for (const raw of options || []) {
    const value = normalizePath(raw.value);
    if (!value) continue;
    byValue.set(value, { ...raw, value, label: raw.label || leafLabel(value) });
  }

  for (const value of Array.from(byValue.keys())) {
    const parts = value.split('/').filter(Boolean);
    for (let i = 1; i < parts.length; i += 1) {
      const parentPath = parts.slice(0, i).join('/');
      if (!byValue.has(parentPath)) {
        byValue.set(parentPath, {
          id: `synthetic:${parentPath}`,
          value: parentPath,
          label: leafLabel(parentPath),
          synthetic: true,
        });
      }
    }
  }

  const all = Array.from(byValue.values());
  const roots = all.filter((option) => !option.value.includes('/')).sort(compareOption);
  for (const option of all) {
    const parts = option.value.split('/').filter(Boolean);
    if (parts.length < 2) continue;
    const parent = parts.slice(0, -1).join('/');
    const list = childrenByParent.get(parent) || [];
    list.push(option);
    childrenByParent.set(parent, list);
  }
  childrenByParent.forEach((list, key) => childrenByParent.set(key, list.sort(compareOption)));

  return { roots, childrenByParent, byValue };
}

export function HierarchySingleSelect({
  options,
  selectedValue,
  onSelect,
  parentLabel = '父级',
  childLabel = '子级',
  emptyLabel = '暂无可选项',
  dense = false,
  allowClear = true,
  searchable = true,
}: HierarchySingleSelectProps) {
  const [search, setSearch] = useState('');
  const normalizedSelected = normalizePath(selectedValue);
  const { roots, childrenByParent, byValue } = useMemo(() => buildTree(options), [options]);
  const selected = normalizedSelected ? byValue.get(normalizedSelected) || null : null;
  const activeParentPath = normalizedSelected
    ? normalizedSelected.includes('/')
      ? normalizedSelected.slice(0, normalizedSelected.lastIndexOf('/'))
      : normalizedSelected
    : roots[0]?.value || null;
  const activeParent = activeParentPath ? byValue.get(activeParentPath) || null : null;
  const children = activeParentPath ? childrenByParent.get(activeParentPath) || [] : [];
  const filtered = search.trim()
    ? Array.from(byValue.values())
        .filter((option) => !option.synthetic)
        .filter((option) => `${option.value} ${option.label || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
        .sort(compareOption)
        .slice(0, 20)
    : [];

  if (!options || options.length === 0) {
    return <Typography variant="body2" sx={{ color: 'text.secondary' }}>{emptyLabel}</Typography>;
  }

  const renderPill = (option: HierarchySingleSelectOption, active: boolean) => (
    <SelectablePill
      key={option.id || option.value}
      selected={active}
      title={option.value}
      onClick={() => option.value ? onSelect(option) : onSelect(null)}
    >
      {option.icon ? `${option.icon} ` : ''}
      {cleanLabel(option.label || leafLabel(option.value))}
    </SelectablePill>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: dense ? 1 : 1.2 }}>
      {searchable && (
        <input
          className="think-native-input"
          value={search}
          onInput={(event: any) => setSearch(event.target.value)}
          placeholder="搜索目标/主题路径"
        />
      )}

      {filtered.length > 0 ? (
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600 }}>
            搜索结果
          </Typography>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {filtered.map((option) => renderPill(option, normalizedSelected === option.value))}
          </div>
        </Box>
      ) : (
        <>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600 }}>
              {parentLabel}
            </Typography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {roots.map((option) => renderPill(option, activeParentPath === option.value || normalizedSelected === option.value))}
              {allowClear && selected && renderPill({ id: '__clear__', value: '', label: '清空' }, false)}
            </div>
          </Box>

          {children.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.75, fontWeight: 600 }}>
                {activeParent ? `${cleanLabel(activeParent.label || leafLabel(activeParent.value))} · ${childLabel}` : childLabel}
              </Typography>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {children.map((option) => renderPill(option, normalizedSelected === option.value))}
              </div>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
