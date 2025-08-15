// src/core/settings/ui/components/TemplateEditorModal.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, TextField, Typography, Box } from '@mui/material';
import { FieldsEditor } from './FieldsEditor';
import type { InputTemplate } from '@core/domain/schema';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    template: Partial<InputTemplate> | null;
    onSave: (template: InputTemplate) => void;
}

export function TemplateEditorModal({ isOpen, onClose, template, onSave }: Props) {
    const [localTemplate, setLocalTemplate] = useState<Partial<InputTemplate> | null>(null);

    useEffect(() => {
        if (template) {
            setLocalTemplate(structuredClone(template));
        } else {
            setLocalTemplate(null);
        }
    }, [template]);

    const handleSave = () => {
        if (localTemplate && localTemplate.id && localTemplate.name) {
            onSave(localTemplate as InputTemplate);
        } else {
            new Notice('模板数据不完整，无法保存！');
        }
    };
    
    if (!isOpen || !localTemplate) return null;

    const [themePath, type] = localTemplate.name?.split('#type:') || ['',''];

    return (
        <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth="md" disablePortal>
            <DialogTitle>
                <Typography>
                    编辑模板: <strong>{themePath.replace('theme:', '')}</strong> / <span style={{color: 'var(--color-accent)'}}>{type}</span>
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3}>
                    <FieldsEditor
                        fields={localTemplate.fields || []}
                        onChange={newFields => setLocalTemplate(current => current ? { ...current, fields: newFields } : null)}
                    />
                    
                    <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出模板</Typography>
                        <TextField
                            label="Output Template"
                            multiline
                            rows={4}
                            value={localTemplate.outputTemplate || ''}
                            onChange={e => setLocalTemplate(current => current ? { ...current, outputTemplate: e.target.value } : null)}
                            fullWidth
                            variant="outlined"
                            placeholder="e.g., {{status.content}} {{content}} 📅 {{dueDate}}"
                            sx={{ fontFamily: 'monospace', '& textarea': { fontSize: '13px' } }}
                        />
                    </Box>
                    
                     <Box>
                        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>目标文件</Typography>
                        <Stack spacing={2}>
                             <TextField
                                label="目标文件路径"
                                value={localTemplate.targetFile || ''}
                                onChange={e => setLocalTemplate(current => current ? { ...current, targetFile: e.target.value } : null)}
                                fullWidth variant="outlined"
                                placeholder="e.g., daily/{{moment:YYYY-MM-DD}}.md"
                            />
                             <TextField
                                label="追加到标题下 (可选)"
                                value={localTemplate.appendUnderHeader || ''}
                                onChange={e => setLocalTemplate(current => current ? { ...current, appendUnderHeader: e.target.value } : null)}
                                fullWidth variant="outlined"
                                placeholder="e.g., ## {{主题}}"
                            />
                        </Stack>
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>取消</Button>
                <Button onClick={handleSave} variant="contained">保存模板</Button>
            </DialogActions>
        </Dialog>
    );
}