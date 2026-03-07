// src/features/settings/ui/components/TemplateEditorModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { Button, Stack, TextField, Typography, Box, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Divider } from '@mui/material';
import { FieldsEditor } from './FieldsEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride, TemplateField } from '@core/public';
import { FloatingPanel, useUiPort, type UseCases } from '@/app/public';
import { TemplateVariableCopier } from './TemplateVariableCopier';

type EditMode = 'inherit' | 'override' | 'disabled';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    block: BlockTemplate;
    theme: ThemeDefinition;
    existingOverride: ThemeOverride | null;
    useCases: UseCases;  // ⚠️ P1: 使用 useCases 替代 appStore
}

export function TemplateEditorModal({ isOpen, onClose, block, theme, existingOverride, useCases }: Props) {
    const ui = useUiPort();
    const [mode, setMode] = useState<EditMode>('inherit');
    const [localOverride, setLocalOverride] = useState<Partial<ThemeOverride>>({});

    useEffect(() => {
        if (existingOverride) {
            setMode(existingOverride.disabled ? 'disabled' : 'override');
            // [修改] 将 structuredClone 替换为 JSON.parse(JSON.stringify())
            setLocalOverride(JSON.parse(JSON.stringify(existingOverride)));
        } else {
            setMode('inherit');
            // 当没有覆写时，为编辑器准备一份默认值（从基础Block复制）
            setLocalOverride({
                // [修改] 将 structuredClone 替换为 JSON.parse(JSON.stringify())
                fields: JSON.parse(JSON.stringify(block.fields)),
                outputTemplate: block.outputTemplate,
                targetFile: block.targetFile,
                appendUnderHeader: block.appendUnderHeader
            });
        }
    }, [isOpen, existingOverride, block]);

    const effectiveBlockForCopier = useMemo<BlockTemplate>(() => {
        return {
            ...block,
            ...localOverride,
            fields: localOverride.fields || block.fields,
        };
    }, [block, localOverride]);

    const handleSave = () => {
        if (mode === 'inherit') {
            if (existingOverride) {
                // ⚠️ P1: 通过 UseCase 层调用，而非直接调用 appStore
                useCases.theme.deleteOverride(block.id, theme.id);
            }
            ui.notice(`已设为继承 "${block.name}" 的基础配置`);
        } else {
            const dataToSave: Omit<ThemeOverride, 'id'> = {
                blockId: block.id,
                themeId: theme.id,
                disabled: mode === 'disabled',
                fields: mode === 'override' ? localOverride.fields : undefined,
                outputTemplate: mode === 'override' ? localOverride.outputTemplate : undefined,
                targetFile: mode === 'override' ? localOverride.targetFile : undefined,
                appendUnderHeader: mode === 'override' ? localOverride.appendUnderHeader : undefined,
            };
            // ⚠️ P1: 通过 UseCase 层调用，而非直接调用 appStore
            useCases.theme.upsertOverride(dataToSave);
            ui.notice(`已保存 "${theme.path}" 对 "${block.name}" 的配置`);
        }
        onClose();
    };
    
    if (!isOpen) return null;

    const isFormDisabled = mode !== 'override';

    return (
        <FloatingPanel
            id={`theme-template-editor-${theme.id}-${block.id}`}
            title={
                <Typography>
                    配置: <strong>{theme.path}</strong> / <span style={{ color: 'var(--color-accent)' }}>{block.name}</span>
                </Typography>
            }
            onClose={onClose}
            width={920}
            maxWidth={'calc(100vw - 32px)'}
            maxHeight={'calc(100vh - 32px)'}
            bodyPadding={0}
        >
            <Box sx={{ p: 2, maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}>
                <Stack spacing={3}>
                    <FormControl component="fieldset">
                        <FormLabel component="legend">配置模式</FormLabel>
                        <RadioGroup row value={mode} onChange={e => setMode((e.target as HTMLInputElement).value as EditMode)}>
                            <FormControlLabel value="inherit" control={<Radio />} label="继承" />
                            <FormControlLabel value="override" control={<Radio />} label="覆写" />
                            <FormControlLabel value="disabled" control={<Radio />} label="禁用" />
                        </RadioGroup>
                    </FormControl>
                    <fieldset disabled={isFormDisabled} style={{ border: 'none', padding: 0, margin: 0, opacity: isFormDisabled ? 0.6 : 1 }}>
                        <Stack spacing={3}>
                            <Divider />
                            <Box>
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出目标</Typography>
                                <Stack spacing={2}>
                                    <TextField label="目标文件路径" value={localOverride.targetFile || ''} onChange={e => setLocalOverride(o => ({...o, targetFile: (e.target as HTMLInputElement).value}))} fullWidth variant="outlined" />
                                    <TextField label="追加到标题下 (可选)" value={localOverride.appendUnderHeader || ''} onChange={e => setLocalOverride(o => ({...o, appendUnderHeader: (e.target as HTMLInputElement).value}))} fullWidth variant="outlined" />
                                </Stack>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>表单字段</Typography>
                                <FieldsEditor fields={localOverride.fields || []} onChange={(newFields: TemplateField[]) => setLocalOverride(o => ({ ...o, fields: newFields }))} />
                            </Box>
                            <Divider />
                            <Box>
                                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>输出模板</Typography>
                                    <TemplateVariableCopier block={effectiveBlockForCopier} />
                                </Stack>
                                <TextField
                                    multiline
                                    rows={8}
                                    value={localOverride.outputTemplate || ''}
                                    onChange={e => setLocalOverride(o => ({...o, outputTemplate: (e.target as HTMLInputElement).value}))}
                                    fullWidth
                                    variant="outlined"
                                    sx={{ fontFamily: 'monospace', '& textarea': { fontSize: '13px' } }}
                                />
                            </Box>
                        </Stack>
                    </fieldset>
                    <Stack direction="row" justifyContent="flex-end" spacing={1}>
                        <Button onClick={onClose}>取消</Button>
                        <Button onClick={handleSave} variant="contained">保存配置</Button>
                    </Stack>
                </Stack>
            </Box>
        </FloatingPanel>
    );
}
