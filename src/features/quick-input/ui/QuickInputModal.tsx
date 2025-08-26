// src/features/quick-input/ui/QuickInputModal.tsx
/** @jsxImportSource preact */
import { App, Modal, Notice } from 'obsidian';
import { h, render, Fragment } from 'preact';
import { useState, useMemo, useEffect, useCallback } from 'preact/hooks';
import { AppStore, useStore } from '@state/AppStore';
import { InputService } from '@core/services/inputService';
import { DataStore } from '@core/services/dataStore';
import type { InputSettings, BlockTemplate, ThemeDefinition, TemplateField, ThemeTreeNode } from '@core/domain/schema';
import { Button, TextField, RadioGroup as MuiRadioGroup, FormControlLabel, Radio, FormControl, Typography, Stack, Divider } from '@mui/material';
import { SimpleSelect } from '@shared/ui/SimpleSelect';
// [修改] 我们依然需要 buildThemeTree 来构建数据结构
import { buildThemeTree } from '@core/utils/themeUtils';

// [说明] 之前的 ThemeSelector 组件已不再需要

export class QuickInputModal extends Modal {
    constructor(
        app: App, 
        private blockId: string, 
        private context?: Record<string, any>,
        private themeId?: string,
    ) {
        super(app);
    }

    onOpen() {
        this.contentEl.empty();
        render(
            <QuickInputForm 
                app={this.app} 
                blockId={this.blockId} 
                context={this.context}
                themeId={this.themeId}
                closeModal={() => this.close()} 
            />, 
            this.contentEl
        );
    }

    onClose() {
        this.contentEl.empty();
    }
}

function getEffectiveTemplate(settings: InputSettings, blockId: string, themeId?: string): { template: BlockTemplate | null; theme: ThemeDefinition | null } {
    const baseBlock = settings.blocks.find(b => b.id === blockId);
    if (!baseBlock) return { template: null, theme: null };
    const theme = settings.themes.find(t => t.id === themeId) || null;
    if (themeId) {
        const override = settings.overrides.find(o => o.blockId === blockId && o.themeId === themeId);
        if (override && override.status === 'enabled') {
            const effectiveTemplate: BlockTemplate = { ...baseBlock, fields: override.fields ?? baseBlock.fields, outputTemplate: override.outputTemplate ?? baseBlock.outputTemplate, targetFile: override.targetFile ?? baseBlock.targetFile, appendUnderHeader: override.appendUnderHeader ?? baseBlock.appendUnderHeader };
            return { template: effectiveTemplate, theme };
        }
    }
    return { template: baseBlock, theme };
}

// [新增] 辅助函数，用于在主题树中查找一个节点及其父节点的路径
const findNodePath = (nodes: ThemeTreeNode[], themeId: string): ThemeTreeNode[] => {
    for (const node of nodes) {
        if (node.themeId === themeId) {
            return [node];
        }
        if (node.children.length > 0) {
            const path = findNodePath(node.children, themeId);
            if (path.length > 0) {
                return [node, ...path];
            }
        }
    }
    return [];
};


function QuickInputForm({ app, blockId, context, themeId, closeModal }: { 
    app: App; 
    blockId: string; 
    context?: Record<string, any>;
    themeId?: string;
    closeModal: () => void 
}) {
    const svc = useMemo(() => new InputService(app), [app]);
    const settings = useStore(state => state.settings.inputSettings);
    
    // [修改] 准备主题树和查找表
    const { themeTree, themeIdMap } = useMemo(() => {
        const { themes, overrides } = settings;
        const disabledThemeIds = new Set<string>();
        overrides.forEach(override => {
            if (override.blockId === blockId && override.status === 'disabled') {
                disabledThemeIds.add(override.themeId);
            }
        });
        const availableThemes = themes.filter(theme => !disabledThemeIds.has(theme.id));
        const themeTree = buildThemeTree(availableThemes);
        const themeIdMap = new Map<string, ThemeDefinition>(themes.map(t => [t.id, t]));
        return { themeTree, themeIdMap };
    }, [settings, blockId]);

    const [selectedThemeId, setSelectedThemeId] = useState<string | null>(themeId || null);

    const { template } = useMemo(() => {
        return getEffectiveTemplate(settings, blockId, selectedThemeId || undefined);
    }, [settings, blockId, selectedThemeId]);
    
    // ... formData 相关的 state 和 effect 保持不变 ...
    const [formData, setFormData] = useState<Record<string, any>>({});
    useEffect(() => {
        if (!template) return;
        const initialData: Record<string, any> = {};
        template.fields.forEach(field => {
            if (context && (context[field.key] !== undefined || context[field.label] !== undefined)) {
                initialData[field.key] = context[field.key] ?? context[field.label];
                return;
            }
            const findOption = (val: string | undefined) => (field.options || []).find(o => o.label === val || o.value === val);
            let defaultOpt = findOption(field.defaultValue);
            if (!defaultOpt && (field.type === 'radio' || field.type === 'select' || field.type === 'rating')) {
                defaultOpt = (field.options || [])[0];
            }
            if (defaultOpt) {
                initialData[field.key] = { value: defaultOpt.value, label: defaultOpt.label || defaultOpt.value };
            } else {
                initialData[field.key] = field.defaultValue || '';
            }
        });
        setFormData(initialData);
    }, [template, context]);

    const handleUpdate = (key: string, value: any, isOptionObject = false) => {
        setFormData(current => ({ ...current, [key]: isOptionObject ? { value: value.value, label: value.label } : value }));
    };
    
    const handleSubmit = async () => {
        if (!template) return;
        try {
            const finalTheme = selectedThemeId ? themeIdMap.get(selectedThemeId) : undefined;
            await svc.executeTemplate(template, formData, finalTheme);
            new Notice(`✅ 已保存`);
            DataStore.instance?.notifyChange?.();
            closeModal();
        } catch (e: any) {
            new Notice(`❌ 保存失败: ${e.message || e}`, 10000);
        }
    };

    // ... renderField 函数保持不变 ...
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
                                        variant={isSelected ? 'contained' : 'outlined'}
                                        onClick={() => handleUpdate(field.key, { value: opt.value, label: opt.label }, true)}
                                        title={`评分: ${opt.label}`}
                                        sx={{ minWidth: '40px', height: '40px', p: 1 }}
                                    >
                                        {displayContent}
                                    </Button>
                                );
                            })}
                        </Stack>
                    </FormControl>
                );

            case 'textarea':
            case 'date':
            case 'time':
            case 'number':
            case 'text':
            default:
                return <TextField label={label} value={value || ''} onChange={e => handleUpdate(field.key, e.target.value)} fullWidth variant="outlined" type={field.type === 'textarea' ? undefined : field.type} multiline={field.type === 'textarea'} rows={field.type === 'textarea' ? 4 : undefined} InputLabelProps={ (field.type === 'date' || field.type === 'time') ? { shrink: true } : undefined} inputProps={ field.type === 'number' ? { min: field.min, max: field.max } : undefined} />;
            
            case 'radio':
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

            case 'select':
                const selectOptions = (field.options || []).map(opt => ({ value: opt.value, label: opt.label || opt.value }));
                return (
                    <FormControl fullWidth>
                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>{label}</Typography>
                        <SimpleSelect value={value || ''} options={selectOptions} placeholder={`-- 选择 ${label} --`} onChange={selectedValue => { const selectedOption = field.options?.find(opt => opt.value === selectedValue); if (selectedOption) { handleUpdate(field.key, { value: selectedOption.value, label: selectedOption.label || selectedOption.value }, true); } }} />
                    </FormControl>
                );
        }
    };
    
    // [新增] 渲染主题选择器的核心函数
    const renderThemeSelector = useCallback(() => {
        const activePath = selectedThemeId ? findNodePath(themeTree, selectedThemeId) : [];
        const levelsToRender: ThemeTreeNode[][] = [themeTree]; // 至少渲染第一层

        activePath.forEach(node => {
            if (node.children && node.children.length > 0) {
                levelsToRender.push(node.children);
            }
        });

        const handleSelect = (newThemeId: string, parentThemeId: string | null) => {
            if (selectedThemeId === newThemeId) {
                setSelectedThemeId(parentThemeId); // 点击已选中的，则返回上一级
            } else {
                setSelectedThemeId(newThemeId);
            }
        };

        return (
            <Stack spacing={1}>
                {levelsToRender.map((nodes, levelIndex) => {
                    const parentNode = activePath[levelIndex - 1];
                    const parentThemeId = parentNode ? parentNode.themeId : null;

                    return (
                        <MuiRadioGroup
                            key={`level-${levelIndex}`}
                            row
                            value={selectedThemeId || ''}
                        >
                            {nodes.map(node => (
                                <FormControlLabel
                                    key={node.id}
                                    value={node.themeId}
                                    // 只有真实主题才可被选中
                                    disabled={!node.themeId}
                                    control={
                                        <Radio
                                            onClick={() => node.themeId && handleSelect(node.themeId, parentThemeId)}
                                            size="small"
                                        />
                                    }
                                    label={node.name}
                                />
                            ))}
                        </MuiRadioGroup>
                    );
                })}
            </Stack>
        );
    }, [themeTree, selectedThemeId]);


    if (!template) {
        return <div>错误：找不到ID为 "{blockId}" 的Block模板。</div>;
    }

    return (
        <div class="think-modal" style={{ padding: '0 1rem 1rem 1rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>快速录入 · {template.name}</h3>
            
            {/* [修改] 渲染逻辑替换为新的横向选择器 */}
            {themeTree.length > 0 && (
                <FormControl component="fieldset" sx={{ mb: 1, width: '100%' }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>主题分类</Typography>
                    {renderThemeSelector()}
                </FormControl>
            )}
            
            <Divider sx={{mb: 2.5}} />
            <Stack spacing={2.5}>
                {template.fields.map(field => <div key={field.id}>{renderField(field)}</div>)}
            </Stack>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem', gap: '8px' }}>
                <Button onClick={handleSubmit} variant="contained">提交</Button>
                <Button onClick={closeModal}>取消</Button>
            </div>
        </div>
    );
}