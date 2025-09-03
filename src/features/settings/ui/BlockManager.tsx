// src/features/settings/ui/BlockManager.tsx
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore, AppStore } from '@state/AppStore';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, Tooltip, Divider, TextField } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useState, useEffect } from 'preact/hooks';
import { FieldsEditor } from './components/FieldsEditor';
import type { BlockTemplate } from '@core/domain/schema';
import { TemplateVariableCopier } from './components/TemplateVariableCopier';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// [修改] 组件 props 现在需要接收 appStore
function SortableBlockItem({ block, openId, setOpenId, handleDelete, appStore }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style}>
            <Accordion expanded={openId === block.id} onChange={() => setOpenId(openId === block.id ? null : block.id)} disableGutters elevation={1} sx={{ '&:before': { display: 'none' } }}>
                <AccordionSummary>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Tooltip title="拖动排序">
                                <Box component="span" {...attributes} {...listeners} sx={{ cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                                    <DragIndicatorIcon sx={{ color: 'text.disabled' }} />
                                </Box>
                            </Tooltip>
                            <Typography fontWeight={500}>{block.name}</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            {/* [修改] 使用 appStore 实例 */}
                            <Tooltip title="复制"><IconButton size="small" onClick={e => { e.stopPropagation(); appStore.duplicateBlock(block.id); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="删除"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDelete(block.id, block.name); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}><DeleteForeverOutlinedIcon /></IconButton></Tooltip>
                        </Stack>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    {/* [修改] 传递 appStore */}
                    <BlockEditor block={block} appStore={appStore} />
                </AccordionDetails>
            </Accordion>
        </div>
    );
}

// [修改] 组件 props 现在需要接收 appStore
function BlockEditor({ block, appStore }: { block: BlockTemplate, appStore: AppStore }) {
    const [localBlock, setLocalBlock] = useState(block);
    useEffect(() => { setLocalBlock(block); }, [block]);
    // [修改] 使用 appStore 实例
    const handleUpdate = (updates: Partial<BlockTemplate>) => { appStore.updateBlock(block.id, updates); };
    const handleBlur = (key: keyof BlockTemplate) => {
        if (localBlock[key] !== block[key]) handleUpdate({ [key]: localBlock[key] });
    };
    return (
        <Stack spacing={3}>
            <TextField label="Block 名称" value={localBlock.name} onChange={e => setLocalBlock(b => ({ ...b, name: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('name')} variant="outlined" size="small" sx={{ maxWidth: 400 }} />
            <Divider />
            <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1 }}>输出目标</Typography>
                <Stack spacing={2}>
                    <TextField label="目标文件路径" value={localBlock.targetFile} onChange={e => setLocalBlock(b => ({ ...b, targetFile: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('targetFile')} placeholder="e.g., {{theme.path}}/{{标题.value}}.md" variant="outlined" size="small" />
                    <TextField label="追加到标题下 (可选)" value={localBlock.appendUnderHeader || ''} onChange={e => setLocalBlock(b => ({ ...b, appendUnderHeader: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('appendUnderHeader')} placeholder="e.g., ## {{block.name}}" variant="outlined" size="small" />
                </Stack>
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, mb: 1.5 }}>表单字段</Typography>
                <FieldsEditor fields={localBlock.fields} onChange={(newFields) => handleUpdate({ fields: newFields })} />
            </Box>
            <Divider />
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>输出模板</Typography>
                    <TemplateVariableCopier block={localBlock} />
                </Stack>
                <TextField label="Output Template" multiline rows={8} value={localBlock.outputTemplate} onChange={e => setLocalBlock(b => ({ ...b, outputTemplate: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('outputTemplate')} placeholder="使用 {{key}} 引用上面定义的字段" variant="outlined" sx={{ fontFamily: 'monospace', '& textarea': { fontSize: '13px' } }} />
            </Box>
        </Stack>
    );
}

// [修改] 组件 props 现在需要接收 appStore
export function BlockManager({ appStore }: { appStore: AppStore }) {
    const blocks = useStore(state => state.settings.inputSettings.blocks);
    const [openId, setOpenId] = useState<string | null>(null);
    
    const handleAdd = () => {
        const newName = `新Block ${blocks.length + 1}`;
        // [修改] 使用 appStore 实例
        appStore.addBlock(newName).then(() => {
            const latestBlock = appStore.getSettings().inputSettings.blocks.at(-1);
            if (latestBlock) setOpenId(latestBlock.id);
        });
    };

    const handleDelete = (id: string, name: string) => {
        if (confirm(`确认删除Block "${name}" 吗？\n所有与此Block相关的主题覆写配置都将被一并删除。`)) {
            // [修改] 使用 appStore 实例
            appStore.deleteBlock(id);
        }
    };

    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            const oldIndex = blocks.findIndex(b => b.id === active.id);
            const newIndex = blocks.findIndex(b => b.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const newSortedBlocks = arrayMove(blocks, oldIndex, newIndex);
            
            const currentSettings = appStore.getSettings();
            const newInputSettings = { ...currentSettings.inputSettings, blocks: newSortedBlocks };
            // [修改] 使用 appStore 实例
            appStore['_updateSettingsAndPersist'](draft => {
                draft.inputSettings = newInputSettings;
            });
        }
    };

    return (
        <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <Typography variant="h6">1. 管理 Block</Typography>
                <Tooltip title="新增Block类型"><IconButton onClick={handleAdd} color="success"><AddCircleOutlineIcon /></IconButton></Tooltip>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{mb: 1.5}}>在这里定义所有快速输入的基础模板，例如任务、打卡、总结等。可拖动排序。</Typography>
            
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    <Stack spacing={1}>
                        {blocks.map((block) => (
                           <SortableBlockItem
                                key={block.id}
                                block={block}
                                openId={openId}
                                setOpenId={setOpenId}
                                handleDelete={handleDelete}
                                appStore={appStore} // [修改] 传递 appStore
                           />
                        ))}
                    </Stack>
                </SortableContext>
            </DndContext>
        </Box>
    );
}