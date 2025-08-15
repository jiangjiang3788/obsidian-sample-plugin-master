// src/core/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import { Box, Typography, Stack, Table, TableHead, TableBody, TableRow, TableCell, Tooltip, Chip, IconButton, TextField, Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useStore, AppStore } from '@state/AppStore';
import type { InputTemplate } from '@core/domain/schema';

// [占位符] 我们将在后续迭代中用真实组件替换
const TemplateEditorModal = ({ isOpen, onClose, template, onSave }: any) => {
    if (!isOpen) return null;
    return (
        <div style={{ position: 'fixed', display: 'flex', flexDirection: 'column', top: '15%', left: '50%', transform: 'translateX(-50%)', width: '600px', maxWidth:'90vw', height: '70vh', background: 'var(--background-secondary)', border: '1px solid var(--background-modifier-border)', zIndex: 1000, padding: '20px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.2)' }}>
            <h2 style={{marginTop: 0}}>编辑模板 (MVP占位符)</h2>
            <p>模板ID: {template?.id}</p>
            <p>模板名称: {template?.name}</p>
            <textarea style={{ flex: 1, width: '100%', whiteSpace: 'pre', fontFamily: 'monospace', fontSize: '12px' }} readOnly value={JSON.stringify(template, null, 2)} />
            <div style={{marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '8px'}}>
                <Button onClick={() => onSave(template)} variant="contained">保存</Button>
                <Button onClick={onClose} variant="outlined">关闭</Button>
            </div>
        </div>
    )
};


// 组件：管理Block类型
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
            <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', gap: 1 }}>
                {(blockTypes || []).map(type => (
                    <Chip key={type} label={type} onDelete={() => handleDelete(type)} />
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

// [FIX] 新增缺失的 ThemePathManager 组件定义
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


// 主界面
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
            setEditingTemplate({
                id: `tpl_${Date.now().toString(36)}`,
                name: name,
                fields: [],
                outputTemplate: '',
                targetFile: ''
            });
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