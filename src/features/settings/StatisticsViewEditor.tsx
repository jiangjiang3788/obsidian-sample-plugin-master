// src/features/settings/ui/components/view-editors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { ViewEditorProps } from './registry';
import { useMemo, useState, useEffect } from 'preact/hooks';

// [架构标准化] 使用 core 层的共享配置，避免重复定义
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';
import { discoverBaseCategories } from '@core/public';

// 重新导出 DEFAULT_CONFIG 以便于 registry.tsx 使用
export { DEFAULT_CONFIG };

// 随机生成一个颜色
const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

export function StatisticsViewEditor({ value, onChange, dataStore }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    const [localCategories, setLocalCategories] = useState(config.categories);

    // 自动发现所有基础分类
    const discoveredCategories = useMemo(() => {
        if (!dataStore) return [];
        const allItems = dataStore.queryItems();
        return discoverBaseCategories(allItems);
    }, [dataStore]);

    // 同步发现的分类和已保存的分类
    useEffect(() => {
        const existingNames = new Set(config.categories.map(c => c.name));
        const newCategories = [...config.categories];
        let changed = false;
        discoveredCategories.forEach(name => {
            if (!existingNames.has(name)) {
                newCategories.push({ name, color: getRandomColor() });
                changed = true;
            }
        });
        if (changed) {
            setLocalCategories(newCategories);
            onChange({ categories: newCategories });
        } else {
            setLocalCategories(config.categories);
        }
    }, [discoveredCategories, config.categories]);

    // 使用上下按钮调整顺序
    const handleMove = (index: number, direction: 'up' | 'down') => {
        const newCategories = [...localCategories];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newCategories.length) return;

        [newCategories[index], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[index]];
        
        setLocalCategories(newCategories);
        onChange({ categories: newCategories });
    };

    const handleColorChange = (index: number, color: string) => {
        const newCategories = [...localCategories];
        newCategories[index].color = color;
        setLocalCategories(newCategories);
        onChange({ categories: newCategories });
    };

    const handleAliasChange = (index: number, alias: string) => {
        const newCategories = [...localCategories];
        newCategories[index].alias = alias;
        setLocalCategories(newCategories);
        onChange({ categories: newCategories });
    };


    return (
        <div class="statistics-editor-container">
            <div class="statistics-section">
                <div class="categories-section-title">分类配置</div>
                <div class="categories-description">
                    每个分类的配置：颜色、名称、别名。您可以使用上下按钮调整顺序。
                </div>
            </div>
            <div>
                {localCategories.map((cat, index) => (
                    <div key={cat.name} class="category-item">
                        {/* 上下移动按钮 */}
                        <div class="move-buttons-container">
                            <button
                                class="move-button"
                                title="上移"
                                disabled={index === 0}
                                onClick={() => handleMove(index, 'up')}
                            >↑</button>
                            <button
                                class="move-button"
                                title="下移"
                                disabled={index === localCategories.length - 1}
                                onClick={() => handleMove(index, 'down')}
                            >↓</button>
                        </div>

                        {/* 颜色选择器 */}
                        <input
                            class="color-picker"
                            type="color"
                            value={cat.color}
                            onChange={(e) => handleColorChange(index, (e.target as HTMLInputElement).value)}
                        />

                        {/* 分类名称 */}
                        <div class="category-name">
                            {cat.name}
                        </div>

                        {/* 别名输入 */}
                        <input
                            class="alias-input"
                            type="text"
                            placeholder="别名"
                            value={cat.alias || ''}
                            onChange={(e) => handleAliasChange(index, (e.target as HTMLInputElement).value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
