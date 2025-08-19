// src/core/settings/ui/components/TemplateEditorModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Typography, Box, RadioGroup, FormControlLabel, Radio, FormControl, FormLabel, Divider } from '@mui/material';
import { FieldsEditor } from './FieldsEditor';
import type { BlockTemplate, ThemeDefinition, ThemeOverride, TemplateField } from '@core/domain/schema';
import { AppStore } from '@state/AppStore';
import { Notice } from 'obsidian';

type EditMode = 'inherit' | 'override' | 'disabled';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    block: BlockTemplate;
    theme: ThemeDefinition;
    existingOverride: ThemeOverride | null;
}

export function TemplateEditorModal({ isOpen, onClose, block, theme, existingOverride }: Props) {
    const [mode, setMode] = useState<EditMode>('inherit');
    const [localOverride, setLocalOverride] = useState<Partial<ThemeOverride>>({});

    useEffect(() => {
        if (existingOverride) {
            setMode(existingOverride.status === 'disabled' ? 'disabled' : 'override');
            setLocalOverride(structuredClone(existingOverride));
        } else {
            setMode('inherit');
            // 当继承时，也从block中复制一份作为覆写的起点，方便用户切换到覆写模式
            setLocalOverride({
                fields: structuredClone(block.fields),
                outputTemplate: block.outputTemplate,
                targetFile: block.targetFile,
                appendUnderHeader: block.appendUnderHeader
            });
        }
    }, [isOpen, existingOverride, block]);

    const handleSave = () => {
        const store = AppStore.instance;
        if (mode === 'inherit') {
            // 如果存在覆写，则删除它
            if (existingOverride) {
                store.deleteOverride(block.id, theme.id);
            }
            new Notice(`已设为继承 "${block.name}" 的基础配置`);
        } else {
            // 更新或创建覆写
            const dataToSave: Omit<ThemeOverride, 'id'> = {
                blockId: block.id,
                themeId: theme.id,
                status: mode === 'disabled' ? 'disabled' : 'enabled',
                ...localOverride,
            };
            store.upsertOverride(dataToSave);
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
                                    <TextField label="目标文件路径" value={localOverride.targetFile || ''} onChange={e => setLocalOverride(o => ({...o, targetFile: e.target.value}))} fullWidth variant="outlined" />
                                    <TextField label="追加到标题下 (可选)" value={localOverride.appendUnderHeader || ''} onChange={e => setLocalOverride(o => ({...o, appendUnderHeader: e.target.value}))} fullWidth variant="outlined" />
                                </Stack>
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>表单字段</Typography>
                                <FieldsEditor
                                    fields={localOverride.fields || []}
                                    onChange={(newFields: TemplateField[]) => setLocalOverride(o => ({ ...o, fields: newFields }))}
                                />
                            </Box>
                            <Divider />
                            <Box>
                                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出模板</Typography>
                                <TextField multiline rows={4} value={localOverride.outputTemplate || ''} onChange={e => setLocalOverride(o => ({...o, outputTemplate: e.target.value}))} fullWidth variant="outlined" sx={{ fontFamily: 'monospace' }} />
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