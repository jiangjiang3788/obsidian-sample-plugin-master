// src/features/settings/ui/ThemeMatrix.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Box, Table, TableHead, TableRow, TableCell, TableBody, IconButton, Tooltip, TextField, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import CancelIcon from '@mui/icons-material/Cancel';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useState, useMemo } from 'preact/hooks';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import type { BlockTemplate, ThemeDefinition, ThemeOverride } from '@core/domain/schema';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function InlineEditor({ value, onSave }: { value: string, onSave: (newValue: string) => void }) {
    const [current, setCurrent] = useState(value);
    const handleBlur = () => { if (current.trim() !== value) { onSave(current.trim()); }};
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') { setCurrent(value); (e.target as HTMLInputElement).blur(); }
    };
    return ( <TextField autoFocus fullWidth variant="standard" value={current} onChange={e => setCurrent((e.target as HTMLInputElement).value)} onBlur={handleBlur} onKeyDown={handleKeyDown} sx={{ '& .MuiInput-input': { py: '4px' } }}/>);
}

// [修改] 组件 props 现在需要接收 appStore
function SortableThemeRow({ theme, blocks, overridesMap, handleCellClick, setEditingThemeId, editingThemeId, appStore }: { 
    theme: ThemeDefinition; 
    blocks: BlockTemplate[]; 
    overridesMap: Map<string, ThemeOverride>; 
    handleCellClick: (block: BlockTemplate, theme: ThemeDefinition) => void; 
    setEditingThemeId: (id: string | null) => void; 
    editingThemeId: string | null;
    appStore: AppStore;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: theme.id });
    const style = { transform: CSS.Transform.toString(transform), transition, display: 'table-row' };
    
    return (
        <TableRow ref={setNodeRef} style={style} hover>
            <TableCell sx={{ width: '40px', p: '0 8px', verticalAlign: 'middle' }}>
                <Tooltip title="拖动排序">
                    <Box component="span" {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                        <DragIndicatorIcon sx={{ color: 'text.disabled' }} />
                    </Box>
                </Tooltip>
            </TableCell>
            <TableCell onDblClick={() => setEditingThemeId(theme.id)} sx={{ cursor: 'text', verticalAlign: 'middle' }}>
                {editingThemeId === theme.id ? ( <InlineEditor value={theme.icon || ''} onSave={(newIcon) => { appStore.updateTheme(theme.id, { icon: newIcon }); setEditingThemeId(null); }} />) : (<Typography align="center">{theme.icon || ' '}</Typography>)}
            </TableCell>
            <TableCell onDblClick={() => setEditingThemeId(theme.id)} sx={{ cursor: 'text', verticalAlign: 'middle' }}>
                 {editingThemeId === theme.id ? (<InlineEditor value={theme.path} onSave={(newPath) => { appStore.updateTheme(theme.id, { path: newPath }); setEditingThemeId(null); }} />) : (theme.path)}
            </TableCell>
            {blocks.map(block => {
                const override = overridesMap.get(`${theme.id}:${block.id}`);
                let cellIcon, cellTitle;
                if (override) {
                    if (override.status === 'disabled') {
                        cellIcon = <CancelIcon sx={{ fontSize: '1.4rem', color: 'error.main' }} />;
                        cellTitle = '已禁用';
                    } else {
                        cellIcon = <EditIcon sx={{ fontSize: '1.4rem', color: 'primary.main' }} />;
                        cellTitle = '已覆写';
                    }
                } else {
                    cellIcon = <TaskAltIcon sx={{ fontSize: '1.4rem', color: 'success.main' }} />;
                    cellTitle = '继承';
                }
                return (
                    <TableCell key={block.id} align="center" onClick={() => handleCellClick(block, theme)} sx={{ cursor: 'pointer', verticalAlign: 'middle' }}>
                        <Tooltip title={cellTitle}><span>{cellIcon}</span></Tooltip>
                    </TableCell>
                );
            })}
            <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                <Tooltip title="删除此主题"><IconButton size="small" onClick={() => {if(confirm(`确定删除主题 "${theme.path}" 吗？`)) appStore.deleteTheme(theme.id)}}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
            </TableCell>
        </TableRow>
    );
}

// [修改] 组件 props 现在需要接收 appStore
export function ThemeMatrix({ appStore }: { appStore: AppStore }) {
    const { blocks, themes, overrides } = useStore(state => state.settings.inputSettings);
    const [newThemePath, setNewThemePath] = useState('');
    const [editingThemeId, setEditingThemeId] = useState<string | null>(null);
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
            // [修改] 使用 appStore 实例
            appStore.addTheme(path);
            setNewThemePath('');
        }
    };

    const handleCellClick = (block: BlockTemplate, theme: ThemeDefinition) => {
        if (editingThemeId) return;
        const override = overridesMap.get(`${theme.id}:${block.id}`) || null;
        setModalData({ block, theme, override });
        setModalOpen(true);
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = themes.findIndex(t => t.id === active.id);
            const newIndex = themes.findIndex(t => t.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            
            const reorderedThemes = arrayMove(themes, oldIndex, newIndex);
            // [修改] 使用 appStore 实例
            appStore.updateInputSettings({ themes: reorderedThemes });
        }
    };

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <Typography variant="h6" gutterBottom>2. 主题配置矩阵</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>管理不同主题对各类Block的配置。双击图标或路径可直接编辑。点击单元格可进行高级配置。</Typography>

            <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: '40px' }} />
                        <TableCell sx={{ width: '10%', fontWeight: 'bold' }}>图标</TableCell>
                        <TableCell sx={{ width: '20%', fontWeight: 'bold' }}>主题</TableCell>
                        {blocks.map(b => <TableCell key={b.id} align="center" sx={{ fontWeight: 'bold' }}>{b.name}</TableCell>)}
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={themes.map(t => t.id)} strategy={verticalListSortingStrategy}>
                        <TableBody>
                            {themes.map(theme => (
                                <SortableThemeRow 
                                    key={theme.id} 
                                    theme={theme} 
                                    blocks={blocks} 
                                    overridesMap={overridesMap} 
                                    handleCellClick={handleCellClick} 
                                    editingThemeId={editingThemeId} 
                                    setEditingThemeId={setEditingThemeId} 
                                    appStore={appStore} // [修改] 传递 appStore
                                />
                            ))}
                        </TableBody>
                    </SortableContext>
                </DndContext>
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
                    appStore={appStore} // [修改] 传递 appStore
                />
            )}
        </Box>
    );
}