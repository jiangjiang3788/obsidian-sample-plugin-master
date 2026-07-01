// src/features/settings/ui/GeneralSettings.tsx
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
import {
  Box,
  Checkbox,
  FormControlLabel,
  Stack,
  ThinkButton,
  Typography,
} from '@shared/ui/public';
import { getActiveCategoryColors } from '@core/types/public';

/** 通用设置：模块开关与全局 CategoryKey 颜色。 */
export function GeneralSettings() {
    const floatingTimerEnabled = useSelector(selectFloatingTimerEnabled);
    const devConsoleStackEnabled = useSelector(selectDevConsoleStackEnabled);
    const savedCategoryColors = useSelector(selectCategoryColors);
    const useCases = useUseCases();

    const activeColors = useMemo(() => getActiveCategoryColors(), [savedCategoryColors]);
    const allCategoryNames = useMemo(
        () => Array.from(new Set(Object.keys(savedCategoryColors))),
        [savedCategoryColors],
    );

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
        <Box className="think-settings-page">
            <section className="think-settings-section">
                <div className="think-settings-section__header">
                    <div>
                        <h2 className="think-settings-section__title">模块开关</h2>
                        <p className="think-settings-help">控制后台功能是否随 Obsidian 一起启动。</p>
                    </div>
                </div>
                <Stack spacing={2}>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={floatingTimerEnabled}
                                onChange={(event) => useCases.settings.setFloatingTimerEnabled((event.target as HTMLInputElement).checked)}
                            />
                        }
                        label="启用悬浮计时器"
                    />
                    <Typography variant="body2" color="text.secondary" className="think-settings-description-indent">
                        关闭后，下次启动 Obsidian 将不再加载悬浮计时器；仍可通过命令面板临时切换可见性。
                    </Typography>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={devConsoleStackEnabled}
                                onChange={(event) => useCases.settings.setDevConsoleStackEnabled((event.target as HTMLInputElement).checked)}
                            />
                        }
                        label="开发模式：错误提示同时输出控制台堆栈"
                    />
                    <Typography variant="body2" color="text.secondary" className="think-settings-description-indent">
                        开启后 toast 仍会显示，同时 console.error 输出完整 stack；关闭后只显示 toast。
                    </Typography>
                </Stack>
            </section>

            <section className="think-settings-section">
                <div className="think-settings-section__header">
                    <div>
                        <h2 className="think-settings-section__title">分类颜色</h2>
                        <p className="think-settings-help">全局 CategoryKey 基础类别颜色，标签和统计视图统一消费该配置。</p>
                    </div>
                </div>

                <div className="think-category-list">
                    {allCategoryNames.map((name) => {
                        const color = activeColors[name] || '#e0e0e0';
                        return (
                            <div key={name} className="think-category-row">
                                <input
                                    className="think-category-color"
                                    type="color"
                                    value={color}
                                    aria-label={`${name} 颜色`}
                                    onChange={(event) => handleColorChange(name, (event.target as HTMLInputElement).value)}
                                />
                                <Typography variant="body1" className="think-category-row__name">{name}</Typography>
                                <Typography variant="caption" color="text.secondary">{color}</Typography>
                                <ThinkButton
                                    className="think-category-row__remove"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveCategory(name)}
                                >
                                    删除
                                </ThinkButton>
                            </div>
                        );
                    })}
                </div>

                <div className="think-category-add">
                    <input
                        className="think-category-color"
                        type="color"
                        value={newCategoryColor}
                        aria-label="新分类颜色"
                        onChange={(event) => setNewCategoryColor((event.target as HTMLInputElement).value)}
                    />
                    <input
                        className="think-input"
                        type="text"
                        value={newCategoryName}
                        placeholder="新分类名称"
                        onChange={(event) => setNewCategoryName((event.target as HTMLInputElement).value)}
                    />
                    <ThinkButton
                        variant="primary"
                        size="sm"
                        onClick={handleAddCategory}
                        disabled={!newCategoryName.trim()}
                    >
                        添加
                    </ThinkButton>
                </div>
            </section>
        </Box>
    );
}
