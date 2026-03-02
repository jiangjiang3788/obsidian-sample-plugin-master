// src/features/settings/ui/components/view-editors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import type { ViewEditorProps } from './registry';
import { useMemo, useState, useEffect } from 'preact/hooks';

// [架构标准化] 使用 core 层的共享配置，避免重复定义
import { STATISTICS_VIEW_DEFAULT_CONFIG as DEFAULT_CONFIG } from '@core/public';
import { discoverBaseCategories, getCategoryColor } from '@core/public';

// 重新导出 DEFAULT_CONFIG 以便于 registry.tsx 使用
export { DEFAULT_CONFIG };


export function StatisticsViewEditor({ value, onChange, dataStore }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    const [localCategories, setLocalCategories] = useState(config.categories);

    // 自动发现所有基础分类
    const discoveredCategories = useMemo(() => {
        if (!dataStore) return [];
        const allItems = dataStore.queryItems();
        return discoverBaseCategories(allItems);
    }, [dataStore]);

    // 同步发现的分类和已保存的分类（颜色统一来自全局设置）
    useEffect(() => {
        const existingNames = new Set(config.categories.map(c => c.name));
        const newCategories = [...config.categories];
        let changed = false;
        discoveredCategories.forEach(name => {
            if (!existingNames.has(name)) {
                newCategories.push({ name, color: getCategoryColor(name) });
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
                    调整分类的显示顺序和别名。颜色由「通用设置 → 分类颜色」统一管理。
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

                        {/* 颜色预览（只读，来自全局设置） */}
                        <div
                            class="color-preview"
                            style={{
                                width: 24,
                                height: 24,
                                borderRadius: 4,
                                backgroundColor: getCategoryColor(cat.name),
                                border: '1px solid var(--text-muted)',
                                flexShrink: 0,
                            }}
                            title={`颜色来自通用设置: ${getCategoryColor(cat.name)}`}
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
