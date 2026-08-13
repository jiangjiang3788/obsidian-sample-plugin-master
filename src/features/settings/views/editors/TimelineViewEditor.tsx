/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { SimpleSelect, ThinkButton, ThinkIcon, ThinkIconButton, ThinkInput } from '@shared/ui/public';
import { collectFileNames } from '@core/utils/public';
import { TIMELINE_VIEW_DEFAULT_CONFIG, type CategoryConfig, type TimelineViewConfig } from '@core/view/public';
import { ViewEditorProps } from './ViewEditorProps';
import { ConfigFieldRow, ConfigSection, ViewEditorShell } from './settingsEditorUi';

export { TIMELINE_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/view/public';
type CategoriesMap = Record<string, CategoryConfig>;
type TimelineConfigPatch = Partial<Pick<TimelineViewConfig, 'defaultHourHeight' | 'categories' | 'progressOrder'>>;
type CategoryPatchResult = { categories: CategoriesMap; progressOrder: string[] };

function normalizeProgressOrder(categories: CategoriesMap, progressOrder: string[]): string[] {
  const seen = new Set<string>();
  const unique = progressOrder.filter((name) => Boolean(categories[name]) && !seen.has(name) && Boolean(seen.add(name)));
  for (const key of Object.keys(categories)) if (!seen.has(key)) unique.push(key);
  return unique;
}

function stripInlineName(config: CategoryConfig): CategoryConfig {
  const { name: _inlineName, ...rest } = config;
  return { name: config.name, ...rest };
}

function nextCategoriesForRename(categories: CategoriesMap, progressOrder: string[], oldName: string, newName: string, newConfig: Partial<CategoryConfig>): CategoryPatchResult {
  const normalizedOrder = normalizeProgressOrder(categories, progressOrder);
  const finalName = (newName || oldName).trim();
  const targetName = finalName !== oldName && Boolean(categories[finalName]) ? oldName : finalName;
  const merged: CategoryConfig = { ...(categories[oldName] || { name: oldName, color: '#cccccc', files: [] }), ...newConfig, name: targetName };
  const nextCats: CategoriesMap = {};
  for (const key of normalizedOrder) {
    if (key === oldName) nextCats[targetName] = stripInlineName(merged);
    else if (categories[key]) nextCats[key] = categories[key];
  }
  if (!nextCats[targetName]) nextCats[targetName] = stripInlineName(merged);
  const nextOrder = normalizedOrder.map((key) => key === oldName ? targetName : key);
  return { categories: nextCats, progressOrder: normalizeProgressOrder(nextCats, nextOrder) };
}

function CategoriesEditor({ categories, progressOrder, fileOptions, onPatch }: {
  categories: CategoriesMap; progressOrder: string[]; fileOptions: string[]; onPatch: (patch: TimelineConfigPatch) => void;
}) {
  const handleCategoryChange = (oldName: string, newConfig: Partial<CategoryConfig>) => {
    const newName = (newConfig.name || oldName).trim();
    onPatch(nextCategoriesForRename(categories, progressOrder, oldName, newName, newConfig));
  };
  const addCategory = () => {
    let newName = '新分类'; let i = 1;
    while (categories[newName]) newName = `新分类${i++}`;
    onPatch({ categories: { ...categories, [newName]: { name: newName, color: '#60a5fa', files: [] } }, progressOrder: [...progressOrder, newName] });
  };
  const removeCategory = (nameToRemove: string) => {
    const { [nameToRemove]: _removed, ...rest } = categories;
    onPatch({ categories: rest, progressOrder: normalizeProgressOrder(rest, progressOrder.filter((name) => name !== nameToRemove)) });
  };
  const moveCategory = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= progressOrder.length) return;
    const next = [...progressOrder]; [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onPatch({ progressOrder: normalizeProgressOrder(categories, next) });
  };

  return (
    <ConfigSection title="分类配置">
      <div className="think-timeline-category-list">
        {progressOrder.map((name, index) => {
          const catConfig = categories[name];
          if (!catConfig) return null;
          const availableFileOptions = fileOptions.filter((file) => !(catConfig.files || []).includes(file)).map((file) => ({ value: file, label: file }));
          return (
            <div key={name} className="think-timeline-category-row">
              <div className="think-timeline-category-row__order">
                <ThinkIconButton label="上移" icon={<ThinkIcon name="chevron-up" />} size="sm" disabled={index === 0} onClick={() => moveCategory(index, -1)} />
                <ThinkIconButton label="下移" icon={<ThinkIcon name="chevron-down" />} size="sm" disabled={index === progressOrder.length - 1} onClick={() => moveCategory(index, 1)} />
              </div>
              <input className="think-category-color" type="color" value={catConfig.color || '#cccccc'} aria-label={`${name} 颜色`} onChange={(event) => handleCategoryChange(name, { color: (event.currentTarget as HTMLInputElement).value })} />
              <ThinkInput defaultValue={name} aria-label="分类名称" onBlur={(event) => handleCategoryChange(name, { name: (event.currentTarget as HTMLInputElement).value.trim() })} />
              <div className="think-timeline-category-row__files">
                {(catConfig.files || []).map((file) => (
                  <button key={file} type="button" className="think-chip" title="移除关键词" onClick={() => handleCategoryChange(name, { files: (catConfig.files || []).filter((item) => item !== file) })}>
                    <span className="think-chip__label">{file}</span><span className="think-chip__remove" aria-hidden="true">×</span>
                  </button>
                ))}
                {availableFileOptions.length > 0 && <SimpleSelect value="" options={availableFileOptions} placeholder="+ 关键词" onChange={(file) => handleCategoryChange(name, { files: [...(catConfig.files || []), file] })} />}
              </div>
              <ThinkIconButton label="删除分类" icon={<ThinkIcon name="trash-2" />} size="sm" tone="danger" onClick={() => removeCategory(name)} />
            </div>
          );
        })}
      </div>
      <div className="think-settings-actions think-settings-actions--start"><ThinkButton leadingIcon={<ThinkIcon name="plus" />} size="sm" variant="secondary" onClick={addCategory}>添加分类</ThinkButton></div>
    </ConfigSection>
  );
}

export function TimelineViewEditor({ value, onChange, dataStore }: ViewEditorProps) {
  const viewConfig: TimelineViewConfig = { ...TIMELINE_VIEW_DEFAULT_CONFIG, ...value };
  const categories: CategoriesMap = viewConfig.categories || {};
  const progressOrder = normalizeProgressOrder(categories, viewConfig.progressOrder || []);
  const fileOptions = useMemo(() => dataStore ? collectFileNames(dataStore.queryItems()) : [], [dataStore]);
  const handlePatch = (patch: TimelineConfigPatch) => onChange(patch as Record<string, any>);
  return (
    <ViewEditorShell title="时间线视图">
      <ConfigSection>
        <ConfigFieldRow label="小时高度"><ThinkInput className="think-settings-field--sm" type="number" min={20} max={200} value={viewConfig.defaultHourHeight} onInput={(event) => handlePatch({ defaultHourHeight: Number((event.currentTarget as HTMLInputElement).value) })} /></ConfigFieldRow>
      </ConfigSection>
      <CategoriesEditor categories={categories} progressOrder={progressOrder} fileOptions={fileOptions} onPatch={handlePatch} />
    </ViewEditorShell>
  );
}
