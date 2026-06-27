// src/features/settings/ui/BlockManager.tsx
/**
 * BlockManager - 记录类型管理组件
 * 
 * ⚠️ P0 止血改造：
 * - 禁止直接调用 appStore['_updateSettingsAndPersist']
 * - 禁止在 props 中传递 appStore
 * - Block 所有操作必须通过 useCases.blocks.* 执行
 */
/** @jsxImportSource preact */
import { h } from 'preact';
import { useSelector, selectInputBlocks, useUseCases } from '@/app/public';
import { Accordion, AccordionSummary, AccordionDetails, Box, Stack, Typography, Tooltip, Divider, TextField } from '@shared/public';
import { AddCircleOutlineIcon, ContentCopyIcon, DeleteForeverOutlinedIcon, DragIndicatorIcon, IconAction } from '@shared/public';
import { useState, useEffect } from 'preact/hooks';
import { FieldsEditor } from './FieldsEditor';
import type { BlockTemplate } from '@core/public';
import { TemplateVariableCopier } from './TemplateVariableCopier';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UseCases } from '@/app/public';

// P1: 组件 props 接收 useCases
function SortableBlockItem({ block, openId, setOpenId, handleDelete, handleDuplicate, useCases }: {
    block: BlockTemplate;
    openId: string | null;
    setOpenId: (id: string | null) => void;
    handleDelete: (id: string, name: string) => void | Promise<void>;
    handleDuplicate: (id: string) => void | Promise<void>;
    useCases: UseCases;
}) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    return (
        <div ref={setNodeRef} style={style}>
            <Accordion expanded={openId === block.id} onChange={() => setOpenId(openId === block.id ? null : block.id)} disableGutters elevation={1} className="think-block-accordion">
                <AccordionSummary>
                    <Box className="think-block-accordion__summary">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            <Tooltip title="拖动排序">
                                <Box component="span" {...(attributes as any)} {...(listeners as any)} className="think-block-accordion__drag">
                                    <DragIndicatorIcon />
                                </Box>
                            </Tooltip>
                            <Typography fontWeight={500}>{block.name}</Typography>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                            {/* P1: 通过 UseCase 层复制记录类型 */}
                            <IconAction label="复制" icon={<ContentCopyIcon fontSize="small" />} onClick={() => handleDuplicate(block.id)} />
                            <IconAction label="删除" icon={<DeleteForeverOutlinedIcon />} onClick={() => handleDelete(block.id, block.name)} color="error" />
                        </Stack>
                    </Box>
                </AccordionSummary>
                <AccordionDetails className="think-block-accordion__details">
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
        <Stack spacing={3} className="think-block-editor">
            <TextField label="记录类型名称" value={localBlock.name} onChange={e => setLocalBlock(b => ({ ...b, name: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('name')} variant="outlined" size="small" className="think-block-editor__field--name" />
            <Divider />
            <Box>
                <Typography variant="h6" className="think-block-editor__title">核心元数据</Typography>
                <Box className="think-block-editor__hint">
                    <Typography variant="body2" color="text.secondary">
                        记录类型是一类记录模板；分类、主题、标签是核心字段。
                    </Typography>
                    <Typography variant="caption" color="text.secondary" className="think-block-editor__template-example">
                        推荐模板行：分类:: {'{{categoryKey}}'} ｜ 主题:: {'{{themePath}}'} ｜ 标签:: {'{{tags}}'}
                    </Typography>
                </Box>
                <TextField
                    label="默认分类"
                    value={localBlock.categoryKey || ''}
                    onChange={e => setLocalBlock(b => ({ ...b, categoryKey: (e.target as HTMLInputElement).value }))}
                    onBlur={() => handleBlur('categoryKey')}
                    placeholder="例如：思考、计划、总结、打卡"
                    helperText="默认写入 {{categoryKey}}；如果表单里有“分类”字段，则以表单输入为准。"
                    variant="outlined"
                    size="small"
                    className="think-block-editor__field--category"
                />
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6" className="think-block-editor__title">保存位置</Typography>
                <Stack spacing={2}>
                    <TextField label="目标文件路径" value={localBlock.targetFile} onChange={e => setLocalBlock(b => ({ ...b, targetFile: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('targetFile')} placeholder="e.g., {{themePath}}/{{标题.value}}.md" variant="outlined" size="small" />
                    <TextField label="追加到标题下 (可选)" value={localBlock.appendUnderHeader || ''} onChange={e => setLocalBlock(b => ({ ...b, appendUnderHeader: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('appendUnderHeader')} placeholder="e.g., ## {{themePath}}" variant="outlined" size="small" />
                </Stack>
            </Box>
            <Divider />
            <Box>
                <Typography variant="h6" className="think-block-editor__title think-block-editor__title--spacious">表单字段</Typography>
                <FieldsEditor fields={localBlock.fields} onChange={(newFields) => handleUpdate({ fields: newFields })} />
            </Box>
            <Divider />
            <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center" className="think-block-editor__output-header">
                    <Typography variant="h6" className="think-block-editor__title">输出模板</Typography>
                    <TemplateVariableCopier block={localBlock} />
                </Stack>
                <TextField label="输出模板" multiline rows={8} value={localBlock.outputTemplate} onChange={e => setLocalBlock(b => ({ ...b, outputTemplate: (e.target as HTMLInputElement).value }))} onBlur={() => handleBlur('outputTemplate')} placeholder="使用 {{key}} 引用上面定义的字段" variant="outlined" className="think-block-editor__template" />
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
    const blocks = useSelector(selectInputBlocks);
    const [openId, setOpenId] = useState<string | null>(null);
    
    // P1: 获取 UseCases
    const useCases = useUseCases();
    
    // P1: 通过 UseCase 层添加 Block
    const handleAdd = async () => {
        const newName = `新记录类型 ${blocks.length + 1}`;
        const newBlock = await useCases.blocks.addBlock(newName);
        if (newBlock) {
            setOpenId(newBlock.id);
        }
    };

    // P1: 通过 UseCase 层删除 Block
    const handleDelete = async (id: string, name: string) => {
        if (confirm(`确认删除记录类型 "${name}" 吗？\n所有与此记录类型相关的预设会一起删除。`)) {
            await useCases.blocks.deleteBlock(id);
        }
    };

    // P1: 通过 UseCase 层复制记录类型
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
        <Box className="think-block-manager">
            <Stack direction="row" alignItems="center" spacing={1} className="think-block-manager__header">
                <Typography variant="h6">记录类型</Typography>
                <IconAction label="新增记录类型" onClick={handleAdd} color="success" icon={<AddCircleOutlineIcon />} />
            </Stack>
            <Typography variant="body2" color="text.secondary" className="think-block-manager__description">定义快速输入可选择的记录类型，例如任务、打卡、总结。可拖动排序。</Typography>
            
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
