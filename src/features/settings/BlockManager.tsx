// src/features/settings/ui/BlockManager.tsx
/**
 * BlockManager - Block 管理组件
 * 
 * ⚠️ P0 止血改造：
 * - 禁止直接调用 appStore['_updateSettingsAndPersist']
 * - 禁止在 props 中传递 appStore
 * - Block 所有操作必须通过 useCases.blocks.* 执行
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useStore } from '@/app/AppStore';
import { useUseCases } from '@/app/AppStoreContext';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, IconButton, Tooltip, Divider, TextField } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { useState, useEffect } from 'preact/hooks';
import { FieldsEditor } from './FieldsEditor';
import type { BlockTemplate } from '@/core/types/schema';
import { TemplateVariableCopier } from './TemplateVariableCopier';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UseCases } from '@/app/usecases';

// P1: 组件 props 接收 useCases
function SortableBlockItem({ block, openId, setOpenId, handleDelete, handleDuplicate, useCases }: {
    block: BlockTemplate;
    openId: string | null;
    setOpenId: (id: string | null) => void;
    handleDelete: (id: string, name: string) => void;
    handleDuplicate: (id: string) => void;
    useCases: UseCases;
}) {
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
                            {/* P1: 通过 UseCase 层复制 Block */}
                            <Tooltip title="复制"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDuplicate(block.id); }}><ContentCopyIcon fontSize="small" /></IconButton></Tooltip>
                            <Tooltip title="删除"><IconButton size="small" onClick={e => { e.stopPropagation(); handleDelete(block.id, block.name); }} sx={{ color: 'text.secondary', '&:hover': { color: 'error.main' } }}><DeleteForeverOutlinedIcon /></IconButton></Tooltip>
                        </Stack>
                    </Box>
                </AccordionSummary>
                <AccordionDetails sx={{ bgcolor: 'action.hover', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
                    {/* P1: 传递 useCases */}
                    <BlockEditor block={block} useCases={useCases} />
                </AccordionDetails>
            </Accordion>
        </div>
    );
}

// P1: 组件 props 接收 useCases
function BlockEditor({ block, useCases }: { block: BlockTemplate, useCases: UseCases }) {
    const [localBlock, setLocalBlock] = useState(block);
    useEffect(() => { setLocalBlock(block); }, [block]);
    // P1: 通过 UseCase 层更新 Block
    const handleUpdate = (updates: Partial<BlockTemplate>) => { useCases.blocks.updateBlock(block.id, updates); };
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

/**
 * BlockManager 组件
 * 
 * P0 止血：所有 Block 操作通过 useCases.blocks 执行
 * ⚠️ 禁止直接调用 appStore 的任何方法
 * ⚠️ 不再接收 appStore 作为 props
 */
export function BlockManager() {
    const blocks = useStore(state => state.settings.inputSettings.blocks);
    const [openId, setOpenId] = useState<string | null>(null);
    
    // P1: 获取 UseCases
    const useCases = useUseCases();
    
    // P1: 通过 UseCase 层添加 Block
    const handleAdd = async () => {
        const newName = `新Block ${blocks.length + 1}`;
        const newBlock = await useCases.blocks.addBlock(newName);
        if (newBlock) {
            setOpenId(newBlock.id);
        }
    };

    // P1: 通过 UseCase 层删除 Block
    const handleDelete = async (id: string, name: string) => {
        if (confirm(`确认删除Block "${name}" 吗？\n所有与此Block相关的主题覆写配置都将被一并删除。`)) {
            await useCases.blocks.deleteBlock(id);
        }
    };

    // P1: 通过 UseCase 层复制 Block
    const handleDuplicate = async (id: string) => {
        await useCases.blocks.duplicateBlock(id);
    };

    /**
     * P0 止血：拖拽排序处理
     * 
     * ⚠️ 禁止：appStore['_updateSettingsAndPersist']
     * ✅ 改用：useCases.blocks.reorderBlocks
     */
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (active && over && active.id !== over.id) {
            // P0: 通过 UseCase 重排序，而非直接操作 appStore 私有方法
            useCases.blocks.reorderBlocks(active.id, over.id);
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
                                handleDuplicate={handleDuplicate}
                                useCases={useCases}
                           />
                        ))}
                    </Stack>
                </SortableContext>
            </DndContext>
        </Box>
    );
}
