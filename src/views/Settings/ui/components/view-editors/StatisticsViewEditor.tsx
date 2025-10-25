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
    categories: [] as { name: string; color: string; alias?: string; }[],
    displayMode: 'smart' as 'linear' | 'logarithmic' | 'smart',
    minVisibleHeight: 15, // 最小可见高度百分比
    usePeriodField: false, // 是否使用周期字段过滤
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


    return (
        <div>
            {/* 显示模式配置 */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>显示模式</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="displayMode"
                            value="smart"
                            checked={config.displayMode === 'smart'}
                            onChange={() => onChange({ displayMode: 'smart' })}
                        />
                        <span>智能模式</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="displayMode"
                            value="linear"
                            checked={config.displayMode === 'linear'}
                            onChange={() => onChange({ displayMode: 'linear' })}
                        />
                        <span>线性模式</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="displayMode"
                            value="logarithmic"
                            checked={config.displayMode === 'logarithmic'}
                            onChange={() => onChange({ displayMode: 'logarithmic' })}
                        />
                        <span>对数模式</span>
                    </label>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    智能模式：自动选择最佳显示方式 | 线性模式：按实际比例显示 | 对数模式：适合数据差异很大的情况
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>最小可见高度:</label>
                    <input
                        type="range"
                        min="10"
                        max="30"
                        step="1"
                        value={config.minVisibleHeight || 15}
                        onChange={(e) => onChange({ minVisibleHeight: parseInt((e.target as HTMLInputElement).value) })}
                        style={{ width: '100px' }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 500, minWidth: '30px' }}>
                        {config.minVisibleHeight || 15}%
                    </span>
                </div>
            </div>

            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>分类配置</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    每个分类的配置：颜色、名称、别名。您可以使用上下按钮调整顺序。
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
                    </div>
                ))}
            </div>
        </div>
    );
}
