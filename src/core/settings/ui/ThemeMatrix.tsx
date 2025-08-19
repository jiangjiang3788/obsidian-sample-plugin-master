// src/core/settings/ui/ThemeMatrix.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, TextField, Button, Stack, Typography, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useState, useMemo } from 'preact/hooks';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';

// [新增] 用于行内编辑的简单输入框组件
function InlineEditor({ value, onSave }: { value: string, onSave: (newValue: string) => void }) {
    const [current, setCurrent] = useState(value);

    const handleBlur = () => {
        if (current.trim() !== value) {
            onSave(current.trim());
        }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
            setCurrent(value); // 恢复原值
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <TextField
            autoFocus
            fullWidth
            variant="standard"
            value={current}
            onChange={e => setCurrent((e.target as HTMLInputElement).value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            sx={{ '& .MuiInput-input': { py: '4px' } }}
        />
    );
}

export function ThemeMatrix() {
    const { blocks, themes, overrides } = useStore(state => state.settings.inputSettings);
    const [newThemePath, setNewThemePath] = useState('');
    
    // [修改] 编辑状态现在只跟踪行ID
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
        // 如果正在编辑行，则不打开模态框
        if (editingThemeId) return;
        const override = overridesMap.get(`${theme.id}:${block.id}`) || null;
        setModalData({ block, theme, override });
        setModalOpen(true);
    };

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>2. 主题配置矩阵</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>管理不同主题对各类Block的配置。双击图标或路径可直接编辑。点击单元格可进行高级配置。</Typography>

            <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
                <TableHead>
                    <TableRow>
                        {/* [修改] 表头分为两列 */}
                        <TableCell sx={{ width: '5%', fontWeight: 'bold' }}>图标</TableCell>
                        <TableCell sx={{ width: '25%', fontWeight: 'bold' }}>主题路径</TableCell>
                        {blocks.map(b => <TableCell key={b.id} align="center" sx={{ fontWeight: 'bold' }}>{b.name}</TableCell>)}
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {themes.map(theme => (
                        <TableRow key={theme.id} hover>
                            {/* [修改] 图标列 */}
                            <TableCell onDblClick={() => setEditingThemeId(theme.id)} sx={{ cursor: 'text' }}>
                                {editingThemeId === theme.id ? (
                                    <InlineEditor 
                                        value={theme.icon || ''} 
                                        onSave={(newIcon) => { AppStore.instance.updateTheme(theme.id, { icon: newIcon }); setEditingThemeId(null); }}
                                    />
                                ) : (
                                    <Typography align="center">{theme.icon || ' '}</Typography>
                                )}
                            </TableCell>
                            {/* [修改] 路径列 */}
                            <TableCell onDblClick={() => setEditingThemeId(theme.id)} sx={{ cursor: 'text' }}>
                                {editingThemeId === theme.id ? (
                                    <InlineEditor 
                                        value={theme.path} 
                                        onSave={(newPath) => { AppStore.instance.updateTheme(theme.id, { path: newPath }); setEditingThemeId(null); }}
                                    />
                                ) : (
                                    theme.path
                                )}
                            </TableCell>

                            {blocks.map(block => {
                                const override = overridesMap.get(`${theme.id}:${block.id}`);
                                let chip: h.JSX.Element;
                                if (override) {
                                    chip = override.status === 'disabled'
                                        ? <Chip label="已禁用" color="default" size="small" variant="outlined" />
                                        : <Chip label="已覆写" color="success" size="small" />;
                                } else {
                                    chip = <Chip label="继承" color="primary" size="small" variant="outlined" />;
                                }
                                return (
                                    <TableCell key={block.id} align="center" onClick={() => handleCellClick(block, theme)} sx={{ cursor: 'pointer' }}>
                                        {chip}
                                    </TableCell>
                                );
                            })}
                            <TableCell align="center">
                                <Tooltip title="删除此主题"><IconButton size="small" onClick={() => {if(confirm(`确定删除主题 "${theme.path}" 吗？`)) AppStore.instance.deleteTheme(theme.id)}}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
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