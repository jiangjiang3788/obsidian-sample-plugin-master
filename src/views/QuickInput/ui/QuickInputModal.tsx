// @ts-nocheck
// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
import { App, Modal, Notice } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { useState, useMemo, useEffect } from 'preact/hooks';
import { useStore } from '@core/stores/AppStore';
import type { InputSettings, BlockTemplate, ThemeDefinition, TemplateField, TemplateFieldOption } from '@core/types/domain/schema';
import { Button, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack, Divider, Box, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { SimpleSelect } from '../../../ui/composites/SimpleSelect';
import { buildThemeTree, ThemeTreeNode } from '@core/utils/themeUtils';
import { dayjs, timeToMinutes, minutesToTime } from '@core/utils/date';
import { dataStore, inputService } from '@store/storeRegistry';
// [核心修改 1] 导入模板渲染工具
import { renderTemplate } from '@core/utils/templateUtils';

export interface QuickInputSaveData {
    template: BlockTemplate;
    formData: Record<string, any>;
    theme?: ThemeDefinition;
}

export class QuickInputModal extends Modal {
    constructor(
        app: App,
        private blockId: string,
        private context?: Record<string, any>,
        private themeId?: string,
        private onSave?: (data: QuickInputSaveData) => void
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        this.modalEl.addClass('think-quick-input-modal');
        
        // 添加输入法检测
        this.setupKeyboardDetection();
        
        render(
            <QuickInputForm
                app={this.app}
                blockId={this.blockId}
                context={this.context}
                themeId={this.themeId}
                onSave={this.onSave}
                closeModal={() => this.close()}
            />,
            this.contentEl
        );
    }

    private setupKeyboardDetection() {
        let initialViewportHeight = window.innerHeight;
        let keyboardHeight = 300; // 默认输入法高度

        // 动态设置CSS变量
        const setKeyboardHeight = (height: number) => {
            keyboardHeight = height;
            this.modalEl.style.setProperty('--keyboard-height', `${height}px`);
            
            // 同时设置在document root上，让CSS可以访问
            document.documentElement.style.setProperty('--keyboard-height', `${height}px`);
        };

        // 检测输入法激活状态
        const handleFocusIn = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                this.modalEl.addClass('keyboard-active');
                
                // 尝试滚动到输入框位置
                setTimeout(() => {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }, 300);
            }
        };

        const handleFocusOut = (e: FocusEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // 延迟移除类，避免输入法切换时的闪烁
                setTimeout(() => {
                    this.modalEl.removeClass('keyboard-active');
                }, 100);
            }
        };

        // 监听窗口大小变化（输入法弹出时）
        const handleResize = () => {
            const currentHeight = window.visualViewport?.height || window.innerHeight;
            const heightDiff = initialViewportHeight - currentHeight;
            
            if (heightDiff > 150) { // 输入法通常至少150px高
                // 输入法弹出了
                this.modalEl.addClass('keyboard-active');
                setKeyboardHeight(heightDiff);
                
                // 确保面板内容可滚动
                const modalContent = this.contentEl.querySelector('.modal-content, .think-modal') as HTMLElement;
                if (modalContent) {
                    modalContent.scrollTop = modalContent.scrollHeight;
                }
            } else {
                // 输入法收起了
                this.modalEl.removeClass('keyboard-active');
                setKeyboardHeight(300); // 重置为默认值
            }
        };

        // 使用Visual Viewport API进行更精确的检测
        const handleVisualViewportResize = () => {
            if (window.visualViewport) {
                const viewportHeight = window.visualViewport.height;
                const heightDiff = initialViewportHeight - viewportHeight;
                
                if (heightDiff > 150) {
                    this.modalEl.addClass('keyboard-active');
                    setKeyboardHeight(heightDiff);
                    
                    // 考虑Visual Viewport的偏移
                    const offsetTop = window.visualViewport.offsetTop || 0;
                    if (offsetTop > 0) {
                        this.modalEl.style.setProperty('--keyboard-offset', `${offsetTop}px`);
                    }
                } else {
                    this.modalEl.removeClass('keyboard-active');
                    setKeyboardHeight(300);
                }
            }
        };

        // 监听焦点事件
        this.contentEl.addEventListener('focusin', handleFocusIn);
        this.contentEl.addEventListener('focusout', handleFocusOut);

        // 监听视口变化
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleVisualViewportResize);
        } else {
            window.addEventListener('resize', handleResize);
        }

        // 监听屏幕方向变化
        const handleOrientationChange = () => {
            setTimeout(() => {
                initialViewportHeight = window.innerHeight;
                setKeyboardHeight(300); // 重置输入法高度
            }, 500);
        };

        window.addEventListener('orientationchange', handleOrientationChange);

        // 初始化CSS变量
        setKeyboardHeight(300);

        // 清理函数
        this.onClose = () => {
            this.contentEl.removeEventListener('focusin', handleFocusIn);
            this.contentEl.removeEventListener('focusout', handleFocusOut);
            
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleVisualViewportResize);
            } else {
                window.removeEventListener('resize', handleResize);
            }
            
            window.removeEventListener('orientationchange', handleOrientationChange);
            
            // 清理CSS变量
            document.documentElement.style.removeProperty('--keyboard-height');
            this.modalEl.style.removeProperty('--keyboard-height');
            this.modalEl.style.removeProperty('--keyboard-offset');
            
            unmountComponentAtNode(this.contentEl);
        };
    }

    onClose() {
        unmountComponentAtNode(this.contentEl);
    }
}

// ... 辅助函数 findNodePath, renderThemeLevels, getEffectiveTemplate 保持不变 ...
function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; theme: ThemeDefinition | null } {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return { template: null, theme: null };
    const theme = settings.themes.find(t => t.id === themeId) || null;
    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        if (override && !override.disabled) {
            const effectiveTemplate: BlockTemplate = { ...baseBlock, fields: override.fields ?? baseBlock.fields, outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, targetFile: override.targetFile ?? baseBlock.targetFile, appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader };
            return { template: effectiveTemplate, theme };
        }
    }
    return { template: baseBlock, theme };
}
const findNodePath = (nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode[] => {
    for (const node of nodes) {
        if (node.themeId === themeId) return [node];
        if (node.children.length > 0) {
            const path = findNodePath(node.children, themeId);
            if (path.length > 0) return [node, ...path];
        }
    }
    return [];
};
const renderThemeLevels = (nodes: ThemeTreeNode[], activePath: ThemeTreeNode[], onSelect: (id: string, parentId: string | null) => void, level = 0) => {
    const parentNode = activePath[level - 1];
    const parentThemeId = parentNode ? parentNode.themeId : null;
    return (
        <div>
            <MuiRadioGroup row value={activePath[level]?.themeId || ''}>
                {nodes.map(node => (
                    <FormControlLabel
                        key={node.id}
                        value={node.themeId}
                        disabled={!node.themeId}
                        control={<Radio onClick={() => node.themeId && onSelect(node.themeId, parentThemeId)} size="small" />}
                        label={node.name}
                    />
                ))}
            </MuiRadioGroup>
            {activePath[level] && activePath[level].children.length > 0 && (
                <div style={{ paddingLeft: '20px' }}>
                    {renderThemeLevels(activePath[level].children, activePath, onSelect, level + 1)}
                </div>
            )}
        </div>
    );
};

function QuickInputForm({ app, blockId, context, themeId, onSave, closeModal }: {
    app: App;
    blockId: string;
    context?: Record<string, any>;
    themeId?: string;
    onSave?: (data: QuickInputSaveData) => void;
    closeModal: () => void;
}) {
    const settings = useStore(state => state.settings.inputSettings);
    
    // ... themeTree, themeIdMap 的 useMemo 保持不变 ...
    const { themeTree, themeIdMap } = useMemo(() => {
        const { themes, overrides } = settings;
        const disabledThemeIds = new Set<string>();
        overrides.forEach(override => {
            if (override.blockId === blockId && override.disabled) {
                disabledThemeIds.add(override.themeId);
            }
        });
        const availableThemes = themes.filter(theme => !disabledThemeIds.has(theme.id));
        const themeTree = buildThemeTree(availableThemes);
        const themeIdMap = new Map<string, ThemeDefinition>(themes.map(t => [t.id, t]));
        return { themeTree, themeIdMap };
    }, [settings, blockId]);


    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(themeId || null);

    // [核心修改 2] `template` 和 `theme` 的计算保持不变
    const { template, theme } = useMemo(() => {
        return getEffectiveTemplate(settings, blockId, selectedThemeId || undefined);
    }, [settings, blockId, selectedThemeId]);

    // [核心修改 3] `formData` 初始化为空对象，具体值由下面的 `useEffect` 动态填充
    const [formData, setFormData] = useState<Record<string, any>>({});

    // [核心修改 4] 使用 useEffect 来响应 `template` 的变化，并重新计算表单的初始/默认值
    useEffect(() => {
        if (!template) return;

        // 构建一个用于模板解析的完整上下文，包含基础 context 和当前选择的 theme
        const dataForParsing = {
            ...context,
            theme: theme ? { path: theme.path, icon: theme.icon || '' } : {}
        };
        
        const initialData: Record<string, any> = {};

        template.fields.forEach(field => {
            // 优先保留用户已输入的值
            if (formData[field.key] !== undefined && formData[field.key] !== '') {
                initialData[field.key] = formData[field.key];
                return;
            }

            let valueAssigned = false;
            const contextValue = context?.[field.key] ?? context?.[field.label];

            if (contextValue !== undefined) {
                // ... (处理 context 值的逻辑保持不变) ...
                if (['select', 'radio', 'rating'].includes(field.type)) {
                    const matchedOption = (field.options || []).find(opt => opt.value === contextValue || opt.label === contextValue);
                    if (matchedOption) {
                        initialData[field.key] = { value: matchedOption.value, label: matchedOption.label || matchedOption.value };
                    } else {
                        initialData[field.key] = contextValue; 
                    }
                } else {
                    initialData[field.key] = contextValue;
                }
                valueAssigned = true;
            }

            if (!valueAssigned) {
                const isSelectable = ['select', 'radio', 'rating'].includes(field.type);
                if (field.defaultValue) {
                    if (isSelectable) {
                        const findOption = (val: string | undefined) => (field.options || []).find(o => o.label === val || o.value === val);
                        let defaultOpt = findOption(field.defaultValue as string);
                        if (!defaultOpt && field.options && field.options.length > 0) defaultOpt = field.options[0];
                        if (defaultOpt) {
                            initialData[field.key] = { value: defaultOpt.value, label: defaultOpt.label || defaultOpt.value };
                        }
                    } else {
                        // 这是我们增强的解析逻辑
                        let finalDefaultValue = field.defaultValue || '';
                        if (typeof finalDefaultValue === 'string') { // 确保是字符串再解析
                            finalDefaultValue = renderTemplate(finalDefaultValue, dataForParsing);
                        }
                        initialData[field.key] = finalDefaultValue;
                    }
                } else {
                    if (field.type === 'date') {
                        initialData[field.key] = dayjs().format('YYYY-MM-DD');
                    } else if (field.type === 'time') {
                        initialData[field.key] = dayjs().format('HH:mm');
                    } else if (isSelectable && field.options && field.options.length > 0) {
                        const firstOption = field.options[0];
                        initialData[field.key] = { value: firstOption.value, label: firstOption.label || firstOption.value };
                    }
                }
            }
        });
        
        // 设置表单数据，保留用户已输入的值
        setFormData(initialData);

    }, [template, theme, context]); // 依赖项：当 template, theme 或 context 变化时，重新运行此 effect

    // ... useEffect for time calculation, handleUpdate, handleSubmit, 和 renderField 保持不变 ...
    useEffect(() => {
        const data = { ...formData };
        const start = data.时间;
        const end = data.结束;
        const durationStr = String(data.时长);
        const duration = !isNaN(parseInt(durationStr)) ? parseInt(durationStr) : null;
        
        const startMinutes = timeToMinutes(start);
        const endMinutes = timeToMinutes(end);
        
        const lastChanged = data.lastChanged;
        let changes: Record<string, any> = {};

        if (startMinutes !== null && endMinutes !== null && lastChanged !== '时长') {
            let newDuration = endMinutes - startMinutes;
            if (newDuration < 0) newDuration += 24 * 60;
            if (newDuration !== duration) {
                changes.时长 = newDuration;
            }
        } else if (startMinutes !== null && duration !== null && lastChanged !== '结束') {
            const newEndTime = minutesToTime(startMinutes + duration);
            if (newEndTime !== end) {
                changes.结束 = newEndTime;
            }
        } else if (endMinutes !== null && duration !== null && lastChanged !== '时间') {
            const newStartTime = minutesToTime(endMinutes - duration);
            if (newStartTime !== start) {
                changes.时间 = newStartTime;
            }
        }

        if (Object.keys(changes).length > 0) {
            setFormData(current => ({ ...current, ...changes, lastChanged: undefined }));
        }

    }, [formData]);
    
    const handleUpdate = (key: string, value: any, isOptionObject = false) => {
        setFormData(current => ({
            ...current,
            [key]: isOptionObject ? { value: value.value, label: value.label } : value,
            lastChanged: key
        }));
    };

    const handleSubmit = async () => {
        if (!template) return;
        if (!inputService) { new Notice(`❌ 保存失败: InputService 未初始化`); return; }

        const finalData = { ...formData };
        const startM = timeToMinutes(finalData.时间);
        const endM = timeToMinutes(finalData.结束);
        let durM = !isNaN(parseInt(finalData.时长)) ? parseInt(finalData.时长) : null;

        if (startM !== null && endM !== null) {
            let finalDuration = endM - startM;
            if (finalDuration < 0) finalDuration += 24 * 60;
            finalData.时长 = finalDuration;
        } else if (startM !== null && durM !== null) {
            finalData.结束 = minutesToTime(startM + durM);
        } else if (endM !== null && durM !== null) {
            finalData.时间 = minutesToTime(endM - durM);
        }

        const finalTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) : undefined;
        if (onSave) {
            onSave({ template, formData: finalData, theme: finalTheme });
            closeModal();
        } else {
            try {
                await inputService.executeTemplate(template, finalData, finalTheme);
                new Notice(`✅ 已保存`);
                dataStore?.notifyChange?.();
                closeModal();
            } catch (e: any) {
                new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
            }
        }
    };
    
    const renderField = (field: TemplateField) => {
        const isComplex = typeof formData[field.key] === 'object' && formData[field.key] !== null;
        const value = isComplex ? formData[field.key]?.value : formData[field.key];
        const label = field.label || field.key;

        switch (field.type) {
            case 'rating':
                return (
                    <FormControl component="fieldset">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            {(field.options || []).map(opt => {
                                const isSelected = isComplex && formData[field.key]?.label === opt.label && formData[field.key]?.value === opt.value;
                                // 检查是否为编辑模式（有context且包含评分信息）
                                const isEditMode = context && (context.评分 !== undefined || context.rating !== undefined);
                                // 检查当前选项是否为编辑前的原始值
                                const isOriginalValue = isEditMode && (
                                    (context.评分 !== undefined && context.评分 === opt.label) ||
                                    (context.rating !== undefined && context.rating === opt.value)
                                );
                                const isImagePath = opt.value && (opt.value.endsWith('.png') || opt.value.endsWith('.jpg') || opt.value.endsWith('.svg'));
                                let displayContent;
                                if (isImagePath) {
                                    const imageUrl = app.vault.adapter.getResourcePath(opt.value);
                                    displayContent = <img src={imageUrl} alt={opt.label} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />;
                                } else {
                                    displayContent = <span style={{ fontSize: '20px' }}>{opt.value}</span>;
                                }
                                return (
                                    <Button
                                        key={opt.label}
                                        variant="text"
                                        onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                                        title={`评分: ${opt.label}`}
                                        sx={{ 
                                            minWidth: '40px', 
                                            height: '40px', 
                                            p: 1, 
                                            opacity: isSelected ? 1 : 0.6, 
                                            '&:hover': { 
                                                opacity: 1,
                                                transform: 'scale(1.05)'
                                            },
                                            // 编辑模式下，原始值显示描边提示；选择模式下，选中值显示描边
                                            border: isEditMode ? 
                                                (isOriginalValue ? '2px solid var(--interactive-accent)' : '1px solid transparent') : 
                                                (isSelected ? '2px solid var(--interactive-accent)' : '1px solid transparent'),
                                            borderRadius: '8px',
                                            transition: 'all 0.2s ease',
                                            boxShadow: (isEditMode && isOriginalValue) || isSelected ? '0 0 4px rgba(var(--interactive-accent-rgb), 0.2)' : 'none'
                                        }}
                                    >
                                        {displayContent}
                                    </Button>
                                );
                            })}
                        </Stack>
                    </FormControl>
                );
            case 'radio':
            case 'select':
                const isRadio = field.type === 'radio';
                if (isRadio) {
                    const selectedOptionObject = formData[field.key];
                    const selectedIndex = field.options?.findIndex(opt => opt.value === selectedOptionObject?.value && opt.label === selectedOptionObject?.label) ?? -1;
                    return (
                        <FormControl component="fieldset">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>{label}</Typography>
                            <MuiRadioGroup row value={selectedIndex > -1 ? String(selectedIndex) : ''} onChange={e => { const newIndex = parseInt(e.target.value, 10); const newlySelectedOption = field.options?.[newIndex]; if (newlySelectedOption) { handleUpdate(field.key, { value: newlySelectedOption.value, label: newlySelectedOption.label || newlySelectedOption.value }, true); } }}>
                                {(field.options || []).map((opt, index) => (
                                    <FormControlLabel key={index} value={String(index)} control={<Radio />} label={opt.label || opt.value} />
                                ))}
                            </MuiRadioGroup>
                        </FormControl>
                    );
                } else { // select
                    const selectOptions = (field.options || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }));
                    return (
                        <FormControl fullWidth>
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{label}</Typography>
                            <SimpleSelect value={value || ''} options={selectOptions} placeholder={`-- 选择 ${label} --`} onChange={selectedValue => { const selectedOption = field.options?.find(opt => opt.value === selectedValue); if (selectedOption) { handleUpdate(field.key, { value: selectedOption.value, label: selectedOption.label || selectedOption.value }, true); } }} />
                        </FormControl>
                    );
                }
            default: {
                const commonInputProps = {
                    className: 'think-native-input',
                    value: value || '',
                    onInput: (e: Event) => handleUpdate(field.key, (e.target as HTMLInputElement).value),
                    onKeyDown: (e: KeyboardEvent) => e.stopPropagation(),
                };

                return (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                        <label style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: '4px' }}>
                            {label}
                        </label>
                        {field.type === 'textarea' ? (
                            <textarea {...commonInputProps} rows={4} />
                        ) : (
                            <input
                                {...commonInputProps}
                                type={field.type === 'text' ? 'text' : field.type}
                                min={field.min}
                                max={field.max}
                            />
                        )}
                    </div>
                );
            }
        }
    };
    // ... return JSX 保持不变 ...
    if (!template) {
        return <div>错误：找不到ID为 "{blockId}" 的Block模板。</div>;
    }

    const activePath = selectedThemeId ? findNodePath(themeTree, selectedThemeId) : [];
    const handleSelectTheme = (newThemeId: string, parentThemeId: string | null) => {
        setSelectedThemeId(selectedThemeId === newThemeId ? parentThemeId : newThemeId);
    };

    return (
        <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: '1rem'  }}>
                <h3 style={{ margin: 0 }}>
                    {onSave ? `开始新任务: ${template.name}` : `快速录入 · ${template.name}`}
                </h3>
                <Tooltip title="关闭">
                    <IconButton onClick={closeModal} size="small">
                        <CloseIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            {themeTree.length > 0 && (
                <FormControl component="fieldset" sx={{ mb: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>主题分类</Typography>
                    <Box sx={{
                        height: '120px',
                        overflowY: 'auto',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                        pr: 0.5
                    }}>
                        {renderThemeLevels(themeTree, activePath, handleSelectTheme)}
                    </Box>
                </FormControl>
            )}

            <Divider sx={{ mb: 2.5 }} />
            <Stack spacing={2.5} sx={{ minHeight: '300px' }}>
                {(() => {
                    const timeFieldKeys = ['时间', '结束', '时长'];
                    const dateFieldKey = '日期';
                    
                    // 按原始顺序获取字段，但重新组织显示顺序
                    const fieldsToRender: h.JSX.Element[] = [];
                    const dateField = template.fields.find(f => f.key === dateFieldKey);
                    const timeFields: TemplateField[] = [];
                    const processedKeys = new Set<string>();
                    
                    // 先渲染非日期和非时间的字段
                    template.fields.forEach(field => {
                        if (field.key !== dateFieldKey && !timeFieldKeys.includes(field.key)) {
                            fieldsToRender.push(<div key={field.id}>{renderField(field)}</div>);
                            processedKeys.add(field.key);
                        } else if (timeFieldKeys.includes(field.key)) {
                            timeFields.push(field);
                            processedKeys.add(field.key);
                        } else if (field.key === dateFieldKey) {
                            processedKeys.add(field.key);
                        }
                    });
                    
                    // 然后添加日期字段
                    if (dateField) {
                        fieldsToRender.push(<div key={dateField.id}>{renderField(dateField)}</div>);
                    }
                    
                    // 最后添加时间三项（按指定顺序）
                    if (timeFields.length > 0) {
                        // 按照 timeFieldKeys 的顺序排序
                        const sortedTimeFields = timeFieldKeys
                            .map(key => timeFields.find(f => f.key === key))
                            .filter(f => f !== undefined) as TemplateField[];
                        
                        fieldsToRender.push(
                            <Box key="time-fields" sx={{ display: 'flex', gap: 1, flexWrap: 'nowrap', '& > div': { flex: 1, minWidth: 0 } }}>
                                {sortedTimeFields.map(field => <div key={field.id}>{renderField(field)}</div>)}
                            </Box>
                        );
                    }
                    
                    return fieldsToRender;
                })()}
            </Stack>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
                <Button onClick={handleSubmit} variant="contained">{onSave ? '创建并开始计时' : '提交'}</Button>
                <Button onClick={closeModal}>取消</Button>
            </div>
        </div>
    );
}
