// src/core/settings/ui/ThemeMatrix.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, TextField, Button, Stack, Typography, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useState, useMemo } from 'preact/hooks';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';

// 主题行内编辑器
function EditableThemeCell({ theme, onSave, onCancel }: { theme: ThemeDefinition, onSave: (updates: Partial<ThemeDefinition>) => void, onCancel: () => void }) {
    const [path, setPath] = useState(theme.path);
    const [icon, setIcon] = useState(theme.icon || '');

    const handleBlur = () => {
        if (path.trim() !== theme.path || icon.trim() !== theme.icon) {
            onSave({ path: path.trim(), icon: icon.trim() });
        } else {
            onCancel();
        }
    };
    
    return (
        <Stack direction="row" spacing={1} onBlur={handleBlur}>
            <TextField variant="outlined" size="small" value={icon} onChange={e => setIcon((e.target as HTMLInputElement).value)} sx={{width: 60}} placeholder="💡" />
            <TextField variant="outlined" size="small" value={path} onChange={e => setPath((e.target as HTMLInputElement).value)} fullWidth />
        </Stack>
    );
}

export function ThemeMatrix() {
    const { blocks, themes, overrides } = useStore(state => state.settings.inputSettings);
    const [newThemePath, setNewThemePath] = useState('');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);

    // [MODAL STATE]
    const [modalOpen, setModalOpen] = useState(false);
    const [modalData, setModalData] = useState<{ block: BlockTemplate; theme: ThemeDefinition; override: ThemeOverride | null } | null>(null);

    const overridesMap = useMemo(() => {
        const map = new Map<string, ThemeOverride>();
        overrides.forEach(o => map.set(`${o.themeId}:${o.blockId}`, o));
        return map;
    }, [overrides]);

    const handleAddTheme = () => {
        const path = newThemePath.trim();
        if (path && !themes.some(t => t.path === path)) {
            AppStore.instance.addTheme(path);
            setNewThemePath('');
        }
    };

    const handleCellClick = (block: BlockTemplate, theme: ThemeDefinition) => {
        const override = overridesMap.get(`${theme.id}:${block.id}`) || null;
        setModalData({ block, theme, override });
        setModalOpen(true);
    };

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>2. 主题配置矩阵</Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>管理不同主题对各类Block的配置。默认继承Block基础配置，可点击单元格进行覆写或禁用。</Typography>

            <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '30%', fontWeight: 'bold' }}>主题 (路径/图标)</TableCell>
                        {blocks.map(b => <TableCell key={b.id} align="center" sx={{ fontWeight: 'bold' }}>{b.name}</TableCell>)}
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {themes.map(theme => (
                        <TableRow key={theme.id} hover>
                            <TableCell>
                                {editingThemeId === theme.id ? (
                                    <EditableThemeCell 
                                        theme={theme}
                                        onSave={(updates) => { AppStore.instance.updateTheme(theme.id, updates); setEditingThemeId(null); }}
                                        onCancel={() => setEditingThemeId(null)}
                                    />
                                ) : (
                                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                                        <Typography>{theme.icon} {theme.path}</Typography>
                                        <IconButton size="small" onClick={() => setEditingThemeId(theme.id)}><EditIcon fontSize="small" /></IconButton>
                                    </Stack>
                                )}
                            </TableCell>
                            {blocks.map(block => {
                                const override = overridesMap.get(`${theme.id}:${block.id}`);
                                let chip: h.JSX.Element;
                                if (override) {
                                    if (override.status === 'disabled') {
                                        chip = <Chip label="已禁用" color="default" size="small" variant="outlined" />;
                                    } else {
                                        chip = <Chip label="已覆写" color="success" size="small" />;
                                    }
                                } else {
                                    chip = <Chip label="继承" color="primary" size="small" variant="outlined" />;
                                }
                                return (
                                    <TableCell key={block.id} align="center" onClick={() => handleCellClick(block, theme)} sx={{cursor: 'pointer'}}>
                                        {chip}
                                    </TableCell>
                                );
                            })}
                            <TableCell align="center">
                                <Tooltip title="删除此主题"><IconButton size="small" onClick={() => AppStore.instance.deleteTheme(theme.id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <TextField placeholder="新主题路径 (如: 个人/习惯)" value={newThemePath} onChange={e => setNewThemePath((e.target as HTMLInputElement).value)} onKeyDown={e => e.key === 'Enter' && handleAddTheme()} size="small" variant="outlined" sx={{ flexGrow: 1, maxWidth: '400px' }} />
                <Button onClick={handleAddTheme} variant="outlined" size="small" startIcon={<AddIcon />}>添加主题</Button>
            </Stack>

            {modalData && (
                <TemplateEditorModal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    block={modalData.block}
                    theme={modalData.theme}
                    existingOverride={modalData.override}
                />
            )}
        </Box>
    );
}