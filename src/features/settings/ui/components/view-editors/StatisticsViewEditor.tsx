// src/features/settings/ui/components/view-editors/StatisticsViewEditor.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { Stack, Typography, Box, IconButton, TextField, Tooltip } from '@mui/material';
import type { ViewEditorProps } from './registry';
// [修改] 从注册表导入 dataStore
import { dataStore } from '@state/storeRegistry';
import { useMemo, useState, useEffect } from 'preact/hooks';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

// 视图的默认配置
export const DEFAULT_CONFIG = {
    categories: [] as { name: string; color: string; alias?: string; scaleFactor?: number; }[],
};

// 随机生成一个颜色
const getRandomColor = () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;

export function StatisticsViewEditor({ value, onChange }: ViewEditorProps) {
    const config = { ...DEFAULT_CONFIG, ...value };
    const [localCategories, setLocalCategories] = useState(config.categories);

    // 自动发现所有基础分类
    const discoveredCategories = useMemo(() => {
        // [修复] 从注册表获取 dataStore 实例
        if (!dataStore) return [];
        const allItems = dataStore.queryItems();
        const categorySet = new Set<string>();
        allItems.forEach(item => {
            const baseCategory = (item.categoryKey || '').split('/')[0];
            if (baseCategory) {
                categorySet.add(baseCategory);
            }
        });
        return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }, []);

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

    const handleScaleFactorChange = (index: number, scaleFactor: number) => {
        const newCategories = [...localCategories];
        newCategories[index].scaleFactor = scaleFactor;
        setLocalCategories(newCategories);
        onChange({ categories: newCategories });
    };

    return (
        <div>
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>分类配置</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    每个分类的所有配置都在一行内：颜色、名称、别名、缩放因子。您可以使用上下按钮调整顺序。
                </div>
            </div>
            <div>
                {localCategories.map((cat, index) => (
                    <div 
                        key={cat.name}
                        style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '8px',
                            padding: '8px',
                            backgroundColor: 'var(--background-modifier-hover)',
                            borderRadius: '6px'
                        }}
                    >
                        {/* 上下移动按钮 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <button
                                title="上移"
                                disabled={index === 0}
                                onClick={() => handleMove(index, 'up')}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: index === 0 ? 'not-allowed' : 'pointer',
                                    padding: '2px',
                                    opacity: index === 0 ? 0.3 : 1
                                }}
                            >↑</button>
                            <button
                                title="下移"
                                disabled={index === localCategories.length - 1}
                                onClick={() => handleMove(index, 'down')}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    cursor: index === localCategories.length - 1 ? 'not-allowed' : 'pointer',
                                    padding: '2px',
                                    opacity: index === localCategories.length - 1 ? 0.3 : 1
                                }}
                            >↓</button>
                        </div>

                        {/* 颜色选择器 */}
                        <input
                            type="color"
                            value={cat.color}
                            onChange={(e) => handleColorChange(index, (e.target as HTMLInputElement).value)}
                            style={{ width: '40px', height: '32px', border: 'none', borderRadius: '4px' }}
                        />

                        {/* 分类名称 */}
                        <div style={{ 
                            fontWeight: 500, 
                            minWidth: '80px',
                            flex: '0 0 auto'
                        }}>
                            {cat.name}
                        </div>

                        {/* 别名输入 */}
                        <input
                            type="text"
                            placeholder="别名"
                            value={cat.alias || ''}
                            onChange={(e) => handleAliasChange(index, (e.target as HTMLInputElement).value)}
                            style={{
                                flex: '1 1 100px',
                                padding: '4px 8px',
                                border: '1px solid var(--background-modifier-border)',
                                borderRadius: '4px',
                                fontSize: '12px',
                                backgroundColor: 'var(--background-primary)'
                            }}
                        />

                        {/* 缩放因子滑块 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '0 0 120px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>×</span>
                            <input
                                type="range"
                                min="0.5"
                                max="3.0"
                                step="0.1"
                                value={cat.scaleFactor || 1.0}
                                onChange={(e) => handleScaleFactorChange(index, parseFloat((e.target as HTMLInputElement).value))}
                                style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: '11px', fontWeight: 500, minWidth: '30px' }}>
                                {(cat.scaleFactor || 1.0).toFixed(1)}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
