// src/features/settings/ui/components/TemplateEditorModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useMemo, useRef } from 'preact/hooks';
import { Button, Stack, Typography, Box, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Divider } from '@shared/public';
import type { JSX } from 'preact';
import { FieldsEditor } from './FieldsEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride, TemplateField } from '@core/public';
import { FloatingPanel, useUiPort, type UseCases } from '@/app/public';
import { TemplateVariableCopier } from './TemplateVariableCopier';
import { diagnosticError, logRenderDiagnostic } from '@shared/public';

type EditMode = 'inherit' | 'override' | 'disabled';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    block: BlockTemplate;
    theme: ThemeDefinition;
    existingOverride: ThemeOverride | null;
    useCases: UseCases;  // ⚠️ P1: 使用 useCases 替代 appStore
}

function cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
}

function readInputValue(event: Event): string {
    return ((event.target || event.currentTarget) as HTMLInputElement | HTMLTextAreaElement).value;
}

function stopEditorEvent(event: Event) {
    event.stopPropagation();
}

const nativeControlBaseStyle: JSX.CSSProperties = {
    width: '100%',
    minWidth: 0,
    boxSizing: 'border-box',
    border: '1px solid var(--background-modifier-border)',
    borderRadius: 6,
    background: 'var(--background-primary)',
    color: 'var(--text-normal)',
    padding: '8px 10px',
    font: 'inherit',
    lineHeight: 1.4,
    userSelect: 'text',
    WebkitUserSelect: 'text',
    pointerEvents: 'auto',
};

const nativeLabelStyle: JSX.CSSProperties = {
    display: 'block',
    marginBottom: 4,
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
};


function logTemplateEditor(scope: string, payload: Record<string, unknown>): void {
    logRenderDiagnostic(`主题模板编辑器/${scope}`, payload);
}

function NativeTextInput({
    label,
    value,
    onInput,
    disabled = false,
    placeholder,
    onMouseDownLog,
    onFocusLog,
}: {
    label: string;
    value: string;
    onInput: (value: string) => void;
    disabled?: boolean;
    placeholder?: string;
    onMouseDownLog?: () => void;
    onFocusLog?: () => void;
}) {
    return (
        <label style={{ display: 'block', minWidth: 0 }}>
            <span style={nativeLabelStyle}>{label}</span>
            <input
                value={value}
                disabled={disabled}
                placeholder={placeholder}
                onMouseDown={(event) => {
                    stopEditorEvent(event as any);
                    onMouseDownLog?.();
                }}
                onClick={stopEditorEvent as any}
                onDblClick={stopEditorEvent as any}
                onKeyDown={stopEditorEvent as any}
                onKeyUp={stopEditorEvent as any}
                onFocus={onFocusLog}
                onInput={(event) => onInput(readInputValue(event as any))}
                style={{
                    ...nativeControlBaseStyle,
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                }}
            />
        </label>
    );
}

function NativeTextarea({
    label,
    value,
    onInput,
    disabled = false,
    rows = 8,
}: {
    label?: string;
    value: string;
    onInput: (value: string) => void;
    disabled?: boolean;
    rows?: number;
}) {
    return (
        <label style={{ display: 'block', minWidth: 0 }}>
            {label ? <span style={nativeLabelStyle}>{label}</span> : null}
            <textarea
                value={value}
                disabled={disabled}
                rows={rows}
                onMouseDown={stopEditorEvent as any}
                onClick={stopEditorEvent as any}
                onDblClick={stopEditorEvent as any}
                onKeyDown={stopEditorEvent as any}
                onKeyUp={stopEditorEvent as any}
                onInput={(event) => onInput(readInputValue(event as any))}
                style={{
                    ...nativeControlBaseStyle,
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    resize: 'vertical',
                    opacity: disabled ? 0.6 : 1,
                    cursor: disabled ? 'not-allowed' : 'text',
                }}
            />
        </label>
    );
}

export function TemplateEditorModal({ isOpen, onClose, block, theme, existingOverride, useCases }: Props) {
    const ui = useUiPort();
    const [mode, setMode] = useState<EditMode>('inherit');
    const [localOverride, setLocalOverride] = useState<Partial<ThemeOverride>>({});
    const localOverrideRef = useRef<Partial<ThemeOverride>>({});

    useEffect(() => {
        if (!isOpen) return;

        if (existingOverride) {
            const nextMode = existingOverride.disabled ? 'disabled' : 'override';
            const clonedOverride = cloneValue(existingOverride);
            logTemplateEditor('初始化', {
                themeId: theme.id,
                themePath: theme.path,
                blockId: block.id,
                blockName: block.name,
                hasExistingOverride: true,
                nextMode,
                initialOverride: clonedOverride,
            });
            setMode(nextMode);
            localOverrideRef.current = clonedOverride;
            setLocalOverride(clonedOverride);
        } else {
            const initialOverride: Partial<ThemeOverride> = {
                fields: cloneValue(block.fields),
                outputTemplate: block.outputTemplate,
                targetFile: block.targetFile,
                appendUnderHeader: block.appendUnderHeader
            };
            logTemplateEditor('初始化', {
                themeId: theme.id,
                themePath: theme.path,
                blockId: block.id,
                blockName: block.name,
                hasExistingOverride: false,
                nextMode: 'inherit',
                initialOverride,
            });
            setMode('inherit');
            localOverrideRef.current = initialOverride;
            setLocalOverride(initialOverride);
        }
    }, [isOpen, existingOverride, block, theme.id, theme.path]);

    const effectiveBlockForCopier = useMemo<BlockTemplate>(() => {
        return {
            ...block,
            ...localOverride,
            fields: localOverride.fields || block.fields,
        };
    }, [block, localOverride]);

    const isFormDisabled = mode !== 'override';

    useEffect(() => {
        if (!isOpen) return;
        logTemplateEditor('渲染状态', {
            当前模式: mode,
            表单是否禁用: isFormDisabled,
            说明: isFormDisabled
                ? '当前不是 override 模式，表单禁用是预期行为。'
                : '当前是 override 模式，表单必须可以点击、聚焦、输入。',
            草稿: localOverride
        });
    }, [isOpen, mode, isFormDisabled, localOverride]);

    const handleModeChange = (_event: unknown, value: string) => {
        const nextMode = value as EditMode;
        logTemplateEditor('模式切换', {
            旧模式: mode,
            新模式: nextMode,
            切换后表单是否应禁用: nextMode !== 'override'
        });
        setMode(nextMode);
    };

    const updateLocalOverride = (updates: Partial<ThemeOverride>, reason: string) => {
        setLocalOverride(previous => {
            const next = { ...previous, ...updates };
            localOverrideRef.current = next;
            logTemplateEditor('草稿更新', {
                原因: reason,
                更新内容: updates,
                更新后草稿: next
            });
            return next;
        });
    };

    const handleSave = async () => {
        const activeElement = document.activeElement as HTMLElement | null;
        if (activeElement && typeof activeElement.blur === 'function') activeElement.blur();
        await new Promise(resolve => window.setTimeout(resolve, 0));
        const draft = localOverrideRef.current;

        logTemplateEditor('保存/开始', {
            mode,
            draft,
            hasExistingOverride: Boolean(existingOverride),
        });

        try {
            if (mode === 'inherit') {
                if (existingOverride) {
                    logTemplateEditor('保存/删除覆写', { blockId: block.id, themeId: theme.id });
                    await useCases.theme.deleteOverride(block.id, theme.id);
                } else {
                    logTemplateEditor('保存/继承无需变更', { blockId: block.id, themeId: theme.id });
                }
                ui.notice(`已设为继承 "${block.name}" 的基础配置`);
            } else {
                const dataToSave: Omit<ThemeOverride, 'id'> = {
                    blockId: block.id,
                    themeId: theme.id,
                    disabled: mode === 'disabled',
                    fields: mode === 'override' ? draft.fields : undefined,
                    outputTemplate: mode === 'override' ? draft.outputTemplate : undefined,
                    targetFile: mode === 'override' ? draft.targetFile : undefined,
                    appendUnderHeader: mode === 'override' ? draft.appendUnderHeader : undefined,
                };
                logTemplateEditor('保存/写入覆写', { dataToSave });
                const result = await useCases.theme.upsertOverride(dataToSave);
                logTemplateEditor('保存/写入完成', { result });
                if (!result) {
                    throw new Error('useCases.theme.upsertOverride 返回 null，通常表示设置仓库尚未初始化或保存层拒绝写入。');
                }
                ui.notice(`已保存 "${theme.path}" 对 "${block.name}" 的配置`);
            }
            onClose();
        } catch (error) {
            diagnosticError('[主题模板编辑器][保存] 保存失败:', error);
            ui.notice('保存主题模板配置失败，请查看控制台日志');
        }
    };
    
    if (!isOpen) return null;

    return (
        <FloatingPanel
            id={`theme-template-editor-${theme.id}-${block.id}`}
            title={
                <Typography>
                    配置: <strong>{theme.path}</strong> / <span style={{ color: 'var(--color-accent)' }}>{block.name}</span>
                </Typography>
            }
            onClose={onClose}
            portal={false}
            placement="inline"
            closeOnOutsideClick={false}
            width="100%"
            minWidth={0}
            maxWidth="100%"
            minHeight={360}
            maxHeight="calc(100vh - 120px)"
            height="min(720px, calc(100vh - 160px))"
            resizable={false}
            bodyPadding={0}
            bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
            <Box sx={{ p: 2, flex: 1, minHeight: 0, overflowY: 'auto', boxSizing: 'border-box' }}>
                <Stack spacing={3}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">配置模式</FormLabel>
                        <RadioGroup row value={mode} onChange={handleModeChange}>
                            <FormControlLabel value="inherit" control={<Radio />} label="继承" />
                            <FormControlLabel value="override" control={<Radio />} label="覆写" />
                            <FormControlLabel value="disabled" control={<Radio />} label="禁用" />
                        </RadioGroup>
                    </FormControl>

                    {/* 不再使用原生 <fieldset disabled> 包裹 MUI 输入控件。
                        在 Preact/MUI 组合下，原生 fieldset 的 disabled 属性容易导致子控件被浏览器层面禁用，
                        即使当前日志显示 mode=override，也会出现“能打开模态框但点击输入框无法编辑”的现象。
                        这里改为逐个给 MUI 控件传 disabled，并保留视觉透明度。 */}
                    <Box sx={{ opacity: isFormDisabled ? 0.6 : 1 }}>
                        <Stack spacing={3}>
                            <Divider />
                            <Box>
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出目标</Typography>
                                <Stack spacing={2}>
                                    <NativeTextInput
                                        label="目标文件路径"
                                        value={localOverride.targetFile || ''}
                                        onInput={value => updateLocalOverride({ targetFile: value }, '输入目标文件路径 native onInput')}
                                        disabled={isFormDisabled}
                                        onMouseDownLog={() => logTemplateEditor('输出目标/鼠标按下', { field: 'targetFile' })}
                                        onFocusLog={() => logTemplateEditor('输出目标/获得焦点', { field: 'targetFile' })}
                                    />
                                    <NativeTextInput
                                        label="追加到标题下 (可选)"
                                        value={localOverride.appendUnderHeader || ''}
                                        onInput={value => updateLocalOverride({ appendUnderHeader: value }, '输入追加标题 native onInput')}
                                        disabled={isFormDisabled}
                                        onMouseDownLog={() => logTemplateEditor('输出目标/鼠标按下', { field: 'appendUnderHeader' })}
                                        onFocusLog={() => logTemplateEditor('输出目标/获得焦点', { field: 'appendUnderHeader' })}
                                    />
                                </Stack>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>表单字段</Typography>
                                <FieldsEditor
                                    fields={localOverride.fields || []}
                                    disabled={isFormDisabled}
                                    onChange={(newFields: TemplateField[]) => updateLocalOverride({ fields: newFields }, '字段编辑器返回新字段列表')}
                                />
                            </Box>
                            <Divider />
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>输出模板</Typography>
                                    <TemplateVariableCopier block={effectiveBlockForCopier} />
                                </Stack>
                                <NativeTextarea
                                    value={localOverride.outputTemplate || ''}
                                    rows={8}
                                    onInput={value => updateLocalOverride({ outputTemplate: value }, '输入输出模板 native onInput')}
                                    disabled={isFormDisabled}
                                />
                            </Box>
                        </Stack>
                    </Box>
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={onClose}>取消</Button>
                        <Button onClick={handleSave} variant="contained">保存配置</Button>
                    </Stack>
                </Stack>
            </Box>
        </FloatingPanel>
    );
}
