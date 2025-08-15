// src/core/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { Box, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell, Tooltip, Chip, IconButton, TextField, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useStore, AppStore } from '@state/AppStore';
import type { InputTemplate } from '@core/domain/schema';
import { TemplateEditorModal } from './components/TemplateEditorModal'; 

function BlockTypeManager() {
    const blockTypes = useStore(state => state.settings.inputSettings?.blockTypes || []);
    const [newType, setNewType] = useState('');

    const handleAdd = () => {
        if (newType && !blockTypes.includes(newType)) {
            AppStore.instance.updateBlockTypes([...blockTypes, newType]);
            setNewType('');
        }
    };

    const handleDelete = (typeToDelete: string) => {
        if (confirm(`确认删除Block类型 "${typeToDelete}" 吗？\n所有与此类型相关的模板配置都将被移除。`)) {
            AppStore.instance.updateBlockTypes(blockTypes.filter(t => t !== typeToDelete));
        }
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>1. 管理 Block 类型</Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 1.5}}>在这里添加、删除全局可用的 Block 类型。表格的列会据此动态变化。</Typography>
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                {(blockTypes || []).map(type => (
                    <Tooltip key={type} title={`点击删除 "${type}"`}>
                        <Chip 
                            label={type} 
                            onClick={() => handleDelete(type)} 
                            onDelete={() => handleDelete(type)} // onDelete 仅用于显示 'x' 图标
                            sx={{ cursor: 'pointer' }}
                        />
                    </Tooltip>
                ))}
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
                <TextField 
                    placeholder="新的Block类型名称..." 
                    value={newType} 
                    onChange={e => setNewType((e.target as HTMLInputElement).value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    size="small"
                />
                <Button onClick={handleAdd} variant="contained" size="small" startIcon={<AddIcon />}>添加</Button>
            </Stack>
        </Box>
    );
}

function ThemePathManager({ onAdd }: { onAdd: (path: string) => void }) {
    const [newPath, setNewPath] = useState('');
    const handleAdd = () => {
        if(newPath.trim()) {
            onAdd(newPath.trim());
            setNewPath('');
        }
    };
    return (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
            <TextField 
                placeholder="新主题路径 (如:个人/习惯)" 
                value={newPath} 
                onChange={e => setNewPath((e.target as HTMLInputElement).value)} 
                onKeyDown={e => e.key === 'Enter' && handleAdd()} 
                size="small" 
                sx={{ flexGrow: 1, maxWidth: '400px' }}
            />
            <Button onClick={handleAdd} variant="outlined" size="small" startIcon={<AddIcon />}>添加主题</Button>
        </Stack>
    );
}


export function InputSettings() {
    const settings = useStore(state => state.settings.inputSettings);
    const { blockTypes = [], themePaths = [], templates = [] } = settings || {};
    const [editingTemplate, setEditingTemplate] = useState<Partial<InputTemplate> | null>(null);

    const sortedThemePaths = useMemo(() => {
        return [...(themePaths || [])].sort((a, b) => a.localeCompare(b, 'zh-CN'));
    }, [themePaths]);

    const templatesByName = useMemo(() => {
        const map = new Map<string, InputTemplate>();
        (templates || []).forEach(t => map.set(t.name, t));
        return map;
    }, [templates]);

    const handleCellClick = (themePath: string, type: string) => {
        const name = `theme:${themePath}#type:${type}`;
        const existingTemplate = templatesByName.get(name);
        if (existingTemplate) {
            setEditingTemplate(structuredClone(existingTemplate));
        } else {
            const baseTemplate = templatesByName.get(`theme:Base#type:${type}`);
            const newTemplate = baseTemplate ? structuredClone(baseTemplate) : { fields: [], outputTemplate: '', targetFile: ''};
            
            newTemplate.id = `tpl_${Date.now().toString(36)}`;
            newTemplate.name = name;
            
            setEditingTemplate(newTemplate);
        }
    };
    
    const handleSaveTemplate = (templateToSave: InputTemplate) => {
        AppStore.instance.upsertTemplate(templateToSave);
        setEditingTemplate(null);
    };
    
    const handleAddTheme = (path: string) => {
        if (path && !(themePaths || []).includes(path)) {
            AppStore.instance.updateThemePaths([...(themePaths || []), path]);
        }
    };
    
    const handleDeleteTheme = (pathToDelete: string) => {
        if (confirm(`确认删除主题 "${pathToDelete}" 吗？\n所有与此主题相关的模板配置都将被移除。`)) {
            AppStore.instance.updateThemePaths((themePaths || []).filter(p => p !== pathToDelete));
        }
    };

    const columns = ['Task', ...(blockTypes || [])];

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <BlockTypeManager />
            
            <Typography variant="h6" gutterBottom sx={{mt: 3}}>2. 配置主题模板</Typography>
            <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{width: '30%', fontWeight: 'bold'}}>主题路径</TableCell>
                        {columns.map(col => <TableCell key={col} align="center" sx={{ fontWeight: 'bold' }}>{col}</TableCell>)}
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                         <TableCell><strong>Base (全局默认)</strong></TableCell>
                         {columns.map(col => (
                            <TableCell key={col} align="center" onClick={() => handleCellClick('Base', col)} sx={{ cursor: 'pointer' }}>
                                {templatesByName.has(`theme:Base#type:${col}`) ? 
                                    <Chip label="已配置" color="primary" size="small" variant="outlined" /> : 
                                    <Chip label="添加默认" color="default" size="small" variant="outlined" icon={<AddIcon />} />}
                            </TableCell>
                         ))}
                         <TableCell />
                    </TableRow>
                    {sortedThemePaths.map(path => (
                        <TableRow key={path} hover>
                            <TableCell sx={{ pl: path.includes('/') ? 4 : 1.5 }}>{path}</TableCell>
                            {columns.map(col => (
                                <TableCell key={col} align="center" onClick={() => handleCellClick(path, col)} sx={{ cursor: 'pointer' }}>
                                    {templatesByName.has(`theme:${path}#type:${col}`) ? 
                                     <Chip label="已配置" color="success" size="small" /> : 
                                     <Chip label="继承" color="default" size="small" variant="outlined" />}
                                </TableCell>
                            ))}
                            <TableCell align="center">
                                <Tooltip title="删除此主题">
                                    <IconButton size="small" onClick={() => handleDeleteTheme(path)}>
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            
            <ThemePathManager onAdd={handleAddTheme} />

            <TemplateEditorModal
                isOpen={!!editingTemplate}
                onClose={() => setEditingTemplate(null)}
                template={editingTemplate}
                onSave={handleSaveTemplate}
            />
        </Box>
    );
}