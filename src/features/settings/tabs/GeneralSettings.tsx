// src/features/settings/ui/GeneralSettings.tsx
/**
 * GeneralSettings - 通用设置组件
 * 
 * ⚠️ P0 止血改造：
 * - 禁止直接调用 appStore.updateFloatingTimerEnabled
 * - 必须通过 useCases.settings.setFloatingTimerEnabled
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { useUseCases, useSelector } from '@/app/public';
import { Box, Typography, Stack, FormControlLabel, Checkbox } from '@mui/material';
import { selectFloatingTimerEnabled, selectDevConsoleStackEnabled, selectCategoryColors } from '@/app/public';
import { generateCategoryColor, getActiveCategoryColors } from '@core/public';

/**
 * 通用设置组件
 */
export function GeneralSettings() {
    // 使用细粒度 selector 订阅设置状态
    const floatingTimerEnabled = useSelector(selectFloatingTimerEnabled);
    const devConsoleStackEnabled = useSelector(selectDevConsoleStackEnabled);
    const savedCategoryColors = useSelector(selectCategoryColors);
    
    // P0: 获取 UseCases
    const useCases = useUseCases();

    // 当前生效的完整颜色映射
    const activeColors = useMemo(() => getActiveCategoryColors(), [savedCategoryColors]);
    
    // 所有已知分类名称（用户已配置的）
    const allCategoryNames = useMemo(() => {
        return Array.from(new Set(Object.keys(savedCategoryColors)));
    }, [savedCategoryColors]);

    // 新增分类状态
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryColor, setNewCategoryColor] = useState('#cccccc');

    const handleColorChange = (name: string, color: string) => {
        const updated = { ...savedCategoryColors, [name]: color };
        useCases.settings.updateCategoryColors(updated);
    };

    const handleAddCategory = () => {
        const trimmed = newCategoryName.trim();
        if (!trimmed) return;
        const updated = { ...savedCategoryColors, [trimmed]: newCategoryColor };
        useCases.settings.updateCategoryColors(updated);
        setNewCategoryName('');
        setNewCategoryColor('#cccccc');
    };

    const handleRemoveCategory = (name: string) => {
        const updated = { ...savedCategoryColors };
        delete updated[name];
        useCases.settings.updateCategoryColors(updated);
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack spacing={2}>
                <Typography variant="h6">模块开关</Typography>
                
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={floatingTimerEnabled}
                            onChange={(e) => useCases.settings.setFloatingTimerEnabled((e.target as HTMLInputElement).checked)}
                        />
                    }
                    label="启用悬浮计时器"
                />
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4, mt: -1.5 }}>
                    关闭后，下次启动Obsidian将不再加载悬浮计时器。你也可以通过命令面板临时切换它的可见性。
                </Typography>

                <FormControlLabel
                    control={
                        <Checkbox
                            checked={devConsoleStackEnabled}
                            onChange={(e) => useCases.settings.setDevConsoleStackEnabled((e.target as HTMLInputElement).checked)}
                        />
                    }
                    label="开发模式：错误 toast 同时输出控制台堆栈"
                />
                <Typography variant="body2" color="text.secondary" sx={{ pl: 4, mt: -1.5 }}>
                    开启后：toast 仍显示，同时 console.error 打出完整 stack（便于定位）。关闭后：只 toast，不污染控制台。
                </Typography>

                {/* ======== 分类颜色配置 ======== */}
                <Typography variant="h6" sx={{ mt: 3 }}>分类颜色</Typography>
                <Typography variant="body2" color="text.secondary">
                    全局 CategoryKey 基础类别颜色配置。修改后所有视图（标签、统计等）统一生效。
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {allCategoryNames.map((name) => {
                                const color = activeColors[name] || '#e0e0e0';
                        return (
                            <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => handleColorChange(name, (e.target as HTMLInputElement).value)}
                                    style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                                />
                                <Typography variant="body1" sx={{ minWidth: 60 }}>{name}</Typography>
                                <Typography variant="caption" color="text.secondary">{color}</Typography>
                                <button
                                    onClick={() => handleRemoveCategory(name)}
                                    style={{ 
                                        marginLeft: 'auto', 
                                        cursor: 'pointer', 
                                        background: 'none', 
                                        border: '1px solid var(--text-muted)', 
                                        borderRadius: 4, 
                                        padding: '2px 8px',
                                        color: 'var(--text-muted)',
                                        fontSize: 12
                                    }}
                                >
                                    删除
                                </button>
                            </Box>
                        );
                    })}
                </Box>

                {/* 新增分类 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 1 }}>
                    <input
                        type="color"
                        value={newCategoryColor}
                        onChange={(e) => setNewCategoryColor((e.target as HTMLInputElement).value)}
                        style={{ width: 32, height: 32, border: 'none', cursor: 'pointer', padding: 0, background: 'none' }}
                    />
                    <input
                        type="text"
                        value={newCategoryName}
                        placeholder="新分类名称"
                        onChange={(e) => setNewCategoryName((e.target as HTMLInputElement).value)}
                        style={{ 
                            padding: '4px 8px', 
                            border: '1px solid var(--text-muted)', 
                            borderRadius: 4,
                            background: 'var(--background-primary)',
                            color: 'var(--text-normal)',
                            fontSize: 14
                        }}
                    />
                    <button
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim()}
                        style={{ 
                            cursor: newCategoryName.trim() ? 'pointer' : 'not-allowed',
                            background: 'var(--interactive-accent)',
                            color: 'var(--text-on-accent)',
                            border: 'none',
                            borderRadius: 4,
                            padding: '4px 12px',
                            fontSize: 13,
                            opacity: newCategoryName.trim() ? 1 : 0.5
                        }}
                    >
                        添加
                    </button>
                </Box>
            </Stack>
        </Box>
    );
}
