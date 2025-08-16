// src/core/settings/ui/InputSettings.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useMemo } from 'preact/hooks';
import {
    Box, Table, TableHead, TableRow, TableCell, TableBody,
    IconButton, Tooltip, TextField, Button, Stack, Typography, Divider, InputBase,
    Chip // 确保 Chip 已导入
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import BlockIcon from '@mui/icons-material/Block';
import { Notice } from 'obsidian';
import { useStore, AppStore } from '@state/AppStore';
import type { InputTemplate } from '@core/domain/schema';
import { TemplateEditorModal } from './components/TemplateEditorModal';

// [补全] Block 类型管理器组件
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
                    variant="outlined"
                />
                <Button onClick={handleAdd} variant="contained" size="small" startIcon={<AddIcon />}>添加</Button>
            </Stack>
        </Box>
    );
}


// 主题路径行内编辑器
function EditableThemePath({ path, onSave, onCancel }: { path: string, onSave: (newPath: string) => void, onCancel: () => void }) {
    const [current, setCurrent] = useState(path);

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') onCancel();
        e.stopPropagation();
    };

    const handleBlur = () => {
        const newPath = current.trim();
        if (newPath && newPath !== path) {
            onSave(newPath);
        } else {
            onCancel();
        }
    };

    return (
        <InputBase
            autoFocus
            fullWidth
            value={current}
            onInput={(e) => setCurrent((e.target as HTMLInputElement).value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            sx={{ bgcolor: 'background.default', px: 1, borderRadius: 1, fontSize: '1.1em' }}
        />
    );
}

export function InputSettings() {
    const settings = useStore(state => state.settings.inputSettings);
    const { blockTypes = [], themePaths = [], templates = [] } = settings || {};

    const [editingTemplate, setEditingTemplate] = useState<Partial<InputTemplate> | null>(null);
    const [editingPath, setEditingPath] = useState<string | null>(null);
    const [newThemePath, setNewThemePath] = useState('');

    const columns = useMemo(() => ['Task', ...blockTypes.sort((a,b)=>a.localeCompare(b,'zh-CN'))], [blockTypes]);

    const templatesByName = useMemo(() => {
        const map = new Map<string, InputTemplate>();
        templates.forEach(t => map.set(t.name, t));
        return map;
    }, [templates]);
    
    // --- Handlers ---
    
    const handleAddTheme = () => {
        const path = newThemePath.trim();
        if (path && !themePaths.includes(path)) {
            AppStore.instance.updateThemePaths([...themePaths, path]);
            setNewThemePath('');
        } else if (themePaths.includes(path)) {
            new Notice(`主题路径 "${path}" 已存在。`);
        }
    };

    const handleDeleteTheme = (path: string) => {
        if (confirm(`确认删除主题 "${path}" 吗？\n所有与此主题相关的模板配置都将被移除。`)) {
            AppStore.instance.updateThemePaths(themePaths.filter(p => p !== path));
        }
    };

    const handleRenameTheme = (oldPath: string, newPath: string) => {
        if (themePaths.includes(newPath)) {
            new Notice(`主题路径 "${newPath}" 已存在，无法重命名。`);
            setEditingPath(null);
            return;
        }
        AppStore.instance.renameThemePath(oldPath, newPath);
        setEditingPath(null);
    };

    const handleSaveTemplate = (templateToSave: InputTemplate) => {
        AppStore.instance.upsertTemplate(templateToSave);
        setEditingTemplate(null);
    };
    
    const handleCellClick = (themePath: string, type: string) => {
        const name = `theme:${themePath}#type:${type}`;
        const existingTemplate = templatesByName.get(name);
        
        if (existingTemplate) {
            setEditingTemplate(structuredClone(existingTemplate));
        } else {
            // "继承" 状态被点击，创建新模板
            const baseTemplate = templatesByName.get(`theme:Base#type:${type}`);
            const newTemplate = baseTemplate 
                ? structuredClone(baseTemplate) 
                : { fields: [], outputTemplate: '', targetFile: '' };
            
            newTemplate.id = `tpl_${Date.now().toString(36)}`;
            newTemplate.name = name;
            delete newTemplate.disabled; // 新创建的覆写默认启用
            
            setEditingTemplate(newTemplate);
        }
    };
    
    const toggleTemplateDisabled = (template: InputTemplate) => {
        AppStore.instance.upsertTemplate({ ...template, disabled: !template.disabled });
    };

    // --- Render Logic ---

    const renderCell = (theme: string, type: string) => {
        const name = `theme:${theme}#type:${type}`;
        const template = templatesByName.get(name);
        const isBase = theme === 'Base';
        
        if (template) {
            // 已配置 (Base 或 覆写)
            return (
                <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
                    <Chip
                        label={template.disabled ? "已禁用" : "已配置"}
                        color={template.disabled ? "default" : (isBase ? "primary" : "success")}
                        size="small"
                        variant={template.disabled ? "outlined" : "filled"}
                        onClick={() => handleCellClick(theme, type)}
                        sx={{ cursor: 'pointer', flexGrow: 1 }}
                    />
                    {!isBase && (
                         <Tooltip title={template.disabled ? "启用此覆写" : "禁用此覆写"}>
                            <IconButton size="small" onClick={() => toggleTemplateDisabled(template)}>
                                <BlockIcon fontSize="small" color={template.disabled ? "disabled" : "action"} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Stack>
            );
        }
        
        // 未配置 (继承)
        return (
            <Chip
                label="继承"
                color="default"
                size="small"
                variant="outlined"
                onClick={() => handleCellClick(theme, type)}
                sx={{ cursor: 'pointer', width: '100%' }}
                icon={<AddIcon />}
            />
        );
    };

    return (
        <Box sx={{ maxWidth: '1000px', mx: 'auto' }}>
            <BlockTypeManager />
            
            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom>2. 配置主题模板</Typography>
            <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap', py: 1, px: 1.5 } }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{width: '30%', fontWeight: 'bold', fontSize: '1.1em'}}>主题路径 (双击编辑)</TableCell>
                        {columns.map(col => <TableCell key={col} align="center" sx={{ fontWeight: 'bold' }}>{col}</TableCell>)}
                        <TableCell align="center" sx={{ fontWeight: 'bold' }}>操作</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {/* Base Row */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell><strong>Base (全局默认)</strong></TableCell>
                        {columns.map(col => (
                            <TableCell key={col} align="center">{renderCell('Base', col)}</TableCell>
                        ))}
                        <TableCell />
                    </TableRow>
                    
                    {/* Theme Rows */}
                    {themePaths.map(path => (
                        <TableRow key={path} hover>
                            <TableCell onDblClick={() => setEditingPath(path)} sx={{ fontSize: '1.1em', cursor: 'text' }}>
                                {editingPath === path ? (
                                    <EditableThemePath
                                        path={path}
                                        onSave={(newPath) => handleRenameTheme(path, newPath)}
                                        onCancel={() => setEditingPath(null)}
                                    />
                                ) : (
                                    path
                                )}
                            </TableCell>
                            {columns.map(col => (
                                <TableCell key={col} align="center">{renderCell(path, col)}</TableCell>
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
            
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <TextField  
                    placeholder="新主题路径 (如:个人/习惯)"  
                    value={newThemePath}  
                    onChange={e => setNewThemePath((e.target as HTMLInputElement).value)}  
                    onKeyDown={e => e.key === 'Enter' && handleAddTheme()}  
                    size="small"
                    variant="outlined"
                    sx={{ flexGrow: 1, maxWidth: '400px' }}
                />
                <Button onClick={handleAddTheme} variant="outlined" size="small" startIcon={<AddIcon />}>添加主题</Button>
            </Stack>

            <TemplateEditorModal
                isOpen={!!editingTemplate}
                onClose={() => setEditingTemplate(null)}
                template={editingTemplate}
                onSave={handleSaveTemplate}
            />
        </Box>
    );
}