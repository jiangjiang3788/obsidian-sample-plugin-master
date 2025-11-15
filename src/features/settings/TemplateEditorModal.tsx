// src/features/settings/ui/components/TemplateEditorModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect, useMemo } from 'preact/hooks';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Typography, Box, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Divider } from '@mui/material';
import { FieldsEditor } from './FieldsEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride, TemplateField } from '@/core/types/schema';
import { AppStore } from '@core/stores/AppStore';
import { Notice } from 'obsidian';
import { TemplateVariableCopier } from './TemplateVariableCopier';

type EditMode = 'inherit' | 'override' | 'disabled';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    block: BlockTemplate;
    theme: ThemeDefinition;
    existingOverride: ThemeOverride | null;
    appStore: AppStore;
}

export function TemplateEditorModal({ isOpen, onClose, block, theme, existingOverride, appStore }: Props) {
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
                appStore.deleteOverride(block.id, theme.id);
            }
            new Notice(`已设为继承 "${block.name}" 的基础配置`);
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
            appStore.upsertOverride(dataToSave);
            new Notice(`已保存 "${theme.path}" 对 "${block.name}" 的配置`);
        }
        onClose();
    };
    
    if (!isOpen) return null;

    const isFormDisabled = mode !== 'override';

    return (
        <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md" disablePortal>
            <DialogTitle>
                <Typography>
                    配置: <strong>{theme.path}</strong> / <span style={{ color: 'var(--color-accent)' }}>{block.name}</span>
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
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
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button onClick={handleSave} variant="contained">保存配置</Button>
            </DialogActions>
        </Dialog>
    );
}
