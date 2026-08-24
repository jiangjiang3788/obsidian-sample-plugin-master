/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { getLeafPath, normalizePath } from '@core/utils/public';

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
  showParentLabel?: boolean;
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

function resolveVisibleChildParent(
  selectedValue: string | null,
  childrenByParent: Map<string, HierarchySingleSelectOption[]>,
): string | null {
  if (!selectedValue) return null;
  if ((childrenByParent.get(selectedValue) || []).length > 0) return selectedValue;
  const parts = selectedValue.split('/').filter(Boolean);
  return parts.length > 1 ? parts.slice(0, -1).join('/') : selectedValue;
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
  showParentLabel = true,
}: HierarchySingleSelectProps) {
  const [search, setSearch] = useState('');
  const normalizedSelected = normalizePath(selectedValue);
  const [navigationPath, setNavigationPath] = useState<string | null>(normalizedSelected || null);
  const { roots, childrenByParent, byValue } = useMemo(() => buildTree(options), [options]);
  const selected = normalizedSelected ? byValue.get(normalizedSelected) || null : null;

  useEffect(() => {
    if (normalizedSelected) setNavigationPath(normalizedSelected);
  }, [normalizedSelected]);

  useEffect(() => {
    if (navigationPath && !byValue.has(navigationPath)) setNavigationPath(null);
  }, [byValue, navigationPath]);

  const activePath = navigationPath || normalizedSelected || null;
  const visibleChildParent = resolveVisibleChildParent(activePath, childrenByParent);
  const visibleChildren = visibleChildParent ? childrenByParent.get(visibleChildParent) || [] : [];
  const filtered = search.trim()
    ? Array.from(byValue.values())
        .filter((option) => !option.synthetic)
        .filter((option) => `${option.value} ${option.label || ''}`.toLowerCase().includes(search.trim().toLowerCase()))
        .sort(compareOption)
        .slice(0, 20)
    : [];

  if (!options || options.length === 0) {
    return <div className="think-qif-hierarchy-empty">{emptyLabel}</div>;
  }

  const isOnSelectedBranch = (value: string) => Boolean(
    activePath && (activePath === value || activePath.startsWith(`${value}/`)),
  );

  const renderPill = (option: HierarchySingleSelectOption, active: boolean) => (
    <SelectablePill
      key={option.id || option.value}
      selected={active}
      title={option.synthetic ? `${option.value}（展开）` : option.value}
      onClick={() => {
        if (!option.value) {
          setNavigationPath(null);
          onSelect(null);
          return;
        }
        setNavigationPath(option.value);
        // Synthetic ancestors exist only for hierarchy navigation. They must not
        // become Record Goal context because they have no direct template.
        if (!option.synthetic) onSelect(option);
      }}
    >
      {option.icon ? `${option.icon} ` : ''}
      {cleanLabel(option.label || leafLabel(option.value))}
    </SelectablePill>
  );

  const renderLevel = (label: string | null, content: ComponentChildren) => (
    <div className={`think-qif-hierarchy-level ${label ? 'think-qif-hierarchy-level--labeled' : 'think-qif-hierarchy-level--unlabeled'}${dense ? ' is-dense' : ''}`}>
      {label ? <div className="think-qif-hierarchy-level__label">{label}</div> : null}
      <div className="think-qif-hierarchy-level__options">{content}</div>
    </div>
  );

  return (
    <div className={`think-qif-hierarchy${dense ? ' is-dense' : ''}`}>
      {searchable && (
        <input
          className="think-native-input"
          value={search}
          onInput={(event: any) => setSearch(event.target.value)}
          placeholder="搜索目标"
        />
      )}

      {filtered.length > 0 ? (
        renderLevel(
          '搜索结果',
          filtered.map((option) => renderPill(option, normalizedSelected === option.value)),
        )
      ) : (
        <>
          {renderLevel(
            showParentLabel ? parentLabel : null,
            <>
              {roots.map((option) => renderPill(option, isOnSelectedBranch(option.value)))}
              {allowClear && selected && renderPill({ id: '__clear__', value: '', label: '清空' }, false)}
            </>,
          )}
          {visibleChildren.length > 0
            ? renderLevel(childLabel, visibleChildren.map((option) => renderPill(option, isOnSelectedBranch(option.value))))
            : null}
        </>
      )}
    </div>
  );
}
