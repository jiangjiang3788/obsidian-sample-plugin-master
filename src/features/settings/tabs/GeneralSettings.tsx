// src/features/settings/tabs/GeneralSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import {
  selectCategoryColors,
  selectDevConsoleStackEnabled,
  selectFloatingTimerEnabled,
  useSelector,
  useUseCases,
} from '@/app/public';
import { ThinkButton, ThinkCheckbox, ThinkInput } from '@shared/ui/public';
import { getActiveCategoryColors } from '@core/types/public';

/** 通用设置：模块开关与全局 CategoryKey 颜色。 */
export function GeneralSettings() {
  const floatingTimerEnabled = useSelector(selectFloatingTimerEnabled);
  const devConsoleStackEnabled = useSelector(selectDevConsoleStackEnabled);
  const savedCategoryColors = useSelector(selectCategoryColors);
  const useCases = useUseCases();
  const activeColors = useMemo(() => getActiveCategoryColors(), [savedCategoryColors]);
  const allCategoryNames = useMemo(() => Array.from(new Set(Object.keys(savedCategoryColors))), [savedCategoryColors]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#cccccc');

  const handleColorChange = (name: string, color: string) => {
    useCases.settings.updateCategoryColors({ ...savedCategoryColors, [name]: color });
  };
  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    useCases.settings.updateCategoryColors({ ...savedCategoryColors, [trimmed]: newCategoryColor });
    setNewCategoryName('');
    setNewCategoryColor('#cccccc');
  };
  const handleRemoveCategory = (name: string) => {
    const updated = { ...savedCategoryColors };
    delete updated[name];
    useCases.settings.updateCategoryColors(updated);
  };

  return (
    <div className="think-settings-page">
      <section className="think-settings-section">
        <h2 className="think-settings-section__title">模块开关</h2>
        <div className="think-settings-stack think-settings-stack--tight">
          <div className="think-settings-row">
            <span className="think-settings-row__label">悬浮计时器</span>
            <div className="think-settings-row__body">
              <ThinkCheckbox
                checked={floatingTimerEnabled}
                onChange={(event) => useCases.settings.setFloatingTimerEnabled((event.currentTarget as HTMLInputElement).checked)}
                label="启用"
                compact
              />
            </div>
          </div>
          <div className="think-settings-row think-settings-row--top">
            <span className="think-settings-row__label think-settings-row__label--top">开发错误</span>
            <div className="think-settings-row__body">
              <ThinkCheckbox
                checked={devConsoleStackEnabled}
                onChange={(event) => useCases.settings.setDevConsoleStackEnabled((event.currentTarget as HTMLInputElement).checked)}
                label="同时输出控制台堆栈"
                compact
              />
            </div>
          </div>
        </div>
      </section>

      <section className="think-settings-section">
        <h2 className="think-settings-section__title">分类颜色</h2>
        <div className="think-category-list">
          {allCategoryNames.map((name) => {
            const color = activeColors[name] || '#e0e0e0';
            return (
              <div key={name} className="think-category-row">
                <input className="think-category-color" type="color" value={color} aria-label={`${name} 颜色`} onChange={(event) => handleColorChange(name, (event.currentTarget as HTMLInputElement).value)} />
                <span className="think-category-row__name">{name}</span>
                <span className="think-settings-caption">{color}</span>
                <ThinkButton className="think-category-row__remove" variant="ghost" size="sm" onClick={() => handleRemoveCategory(name)}>删除</ThinkButton>
              </div>
            );
          })}
        </div>
        <div className="think-category-add">
          <input className="think-category-color" type="color" value={newCategoryColor} aria-label="新分类颜色" onChange={(event) => setNewCategoryColor((event.currentTarget as HTMLInputElement).value)} />
          <ThinkInput value={newCategoryName} placeholder="新分类名称" onInput={(event) => setNewCategoryName((event.currentTarget as HTMLInputElement).value)} />
          <ThinkButton variant="primary" size="sm" onClick={handleAddCategory} disabled={!newCategoryName.trim()}>添加</ThinkButton>
        </div>
      </section>
    </div>
  );
}
