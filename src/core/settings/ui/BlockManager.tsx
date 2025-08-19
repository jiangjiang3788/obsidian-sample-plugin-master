// src/core/settings/ui/BlockManager.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, TextField, Tooltip, Divider, Button } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useState, useEffect } from 'preact/hooks';
import { FieldsEditor } from './components/FieldsEditor';
import type { BlockTemplate } from '@core/domain/schema';

// Block 编辑器内部组件
function BlockEditor({ block }: { block: BlockTemplate }) {
    const [localBlock, setLocalBlock] = useState(block);

    useEffect(() => {
        setLocalBlock(block);
    }, [block]);

    const handleUpdate = (updates: Partial<BlockTemplate>) => {
        AppStore.instance.updateBlock(block.id, updates);
    };

    const handleBlur = (key: keyof BlockTemplate) => {
        if (localBlock[key] !== block[key]) {
            handleUpdate({ [key]: localBlock[key] });
        }
    };
    
    return (
        <Stack spacing={3}>
            <TextField
                label="Block 名称"
                value={localBlock.name}
                onChange={e => setLocalBlock(b => ({...b, name: (e.target as HTMLInputElement).value}))}
                onBlur={() => handleBlur('name')}
                variant="outlined"
                size="small"
                sx={{ maxWidth: 400 }}
            />
            <Divider />
            <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出目标</Typography>
                <Stack spacing={2}>
                    <TextField
                        label="目标文件路径"
                        value={localBlock.targetFile}
                        onChange={e => setLocalBlock(b => ({...b, targetFile: e.target.value}))}
                        onBlur={() => handleBlur('targetFile')}
                        placeholder="e.g., daily/{{moment:YYYY-MM-DD}}.md"
                        variant="outlined" size="small"
                    />
                    <TextField
                        label="追加到标题下 (可选)"
                        value={localBlock.appendUnderHeader}
                        onChange={e => setLocalBlock(b => ({...b, appendUnderHeader: e.target.value}))}
                        onBlur={() => handleBlur('appendUnderHeader')}
                        placeholder="e.g., ## {{主题}}"
                        variant="outlined" size="small"
                    />
                </Stack>
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>表单字段</Typography>
                <FieldsEditor
                    fields={localBlock.fields}
                    onChange={(newFields) => handleUpdate({ fields: newFields })}
                />
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出模板</Typography>
                <TextField
                    label="Output Template"
                    multiline
                    rows={4}
                    value={localBlock.outputTemplate}
                    onChange={e => setLocalBlock(b => ({...b, outputTemplate: e.target.value}))}
                    onBlur={() => handleBlur('outputTemplate')}
                    placeholder="使用 {{key}} 引用上面定义的字段"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', '& textarea': { fontSize: '13px' } }}
                />
            </Box>
        </Stack>
    );
}


// Block 管理器主组件
export function BlockManager() {
    const blocks = useStore(state => state.settings.inputSettings.blocks);
    const [openId, setOpenId] = useState<string | null>(blocks.length > 0 ? blocks[0].id : null);

    const handleAdd = () => {
        const newName = `新Block ${blocks.length + 1}`;
        AppStore.instance.addBlock(newName).then(() => {
            const latestBlock = AppStore.instance.getSettings().inputSettings.blocks.at(-1);
            if (latestBlock) setOpenId(latestBlock.id);
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`确认删除Block "${name}" 吗？\n所有与此Block相关的主题覆写配置都将被一并删除。`)) {
            AppStore.instance.deleteBlock(id);
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">1. 管理 Block</Typography>
                <Tooltip title="新增Block类型">
                    <IconButton onClick={handleAdd} color="success"><AddCircleOutlineIcon /></IconButton>
                </Tooltip>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{mb: 1.5}}>在这里定义所有快速输入的基础模板，例如任务、打卡、总结等。</Typography>
            
            <Stack spacing={1}>
                {blocks.map((block, index) => (
                    <Accordion
                        key={block.id}
                        expanded={openId === block.id}
                        onChange={() => setOpenId(openId === block.id ? null : block.id)}
                        disableGutters elevation={1} sx={{ '&:before': { display: 'none' } }}
                    >
                        <AccordionSummary>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                <Typography fontWeight={500}>{block.name}</Typography>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Tooltip title="上移"><span><IconButton size="small" disabled={index === 0} onClick={e => { e.stopPropagation(); AppStore.instance.moveBlock(block.id, 'up'); }}>▲</IconButton></span></Tooltip>
                                    <Tooltip title="下移"><span><IconButton size="small" disabled={index === blocks.length - 1} onClick={e => { e.stopPropagation(); AppStore.instance.moveBlock(block.id, 'down'); }}>▼</IconButton></span></Tooltip>
                                    <Tooltip title="复制"><IconButton size="small" onClick={e => { e.stopPropagation(); AppStore.instance.duplicateBlock(block.id); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                                    <Tooltip title="删除"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDelete(block.id, block.name); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}><DeleteForeverOutlinedIcon /></IconButton></Tooltip>
                                </Stack>
                            </Box>
                        </AccordionSummary>
                        <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                            <BlockEditor block={block} />
                        </AccordionDetails>
                    </Accordion>
                ))}
            </Stack>
        </Box>
    );
}