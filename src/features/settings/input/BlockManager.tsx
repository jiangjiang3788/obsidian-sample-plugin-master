// Canonical Record 的 Markdown Block 由 RecordSchemaDefinition + Record Codec 统一生成
/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useSelector, selectInputBlocks, useUseCases } from '@/app/public';
import { ThinkButton, ThinkIcon, ThinkIconButton, ThinkInput } from '@shared/ui/public';
import { FieldsEditor } from './FieldsEditor';
import { EnergyRecordTypeSettings } from './EnergyRecordTypeSettings';
import type { RecordCaptureTemplate } from '@core/types/public';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { UseCases } from '@/app/public';

function SortableBlockItem({ block, openId, setOpenId, handleDelete, handleDuplicate, useCases }: {
  block: RecordCaptureTemplate; openId: string | null; setOpenId: (id: string | null) => void;
  handleDelete: (id: string, name: string) => void | Promise<void>; handleDuplicate: (id: string) => void | Promise<void>; useCases: UseCases;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="think-block-accordion">
      <div className="think-block-accordion__summary">
        <button type="button" className="think-block-accordion__drag" {...(attributes as any)} {...(listeners as any)} aria-label="拖动排序"><ThinkIcon name="grip-vertical" /></button>
        <button type="button" className="think-block-accordion__title" onClick={() => setOpenId(openId === block.id ? null : block.id)}>{block.name}</button>
        <ThinkIconButton label="复制" icon={<ThinkIcon name="copy" />} size="sm" onClick={() => handleDuplicate(block.id)} />
        <ThinkIconButton label="删除" icon={<ThinkIcon name="trash-2" />} tone="danger" size="sm" onClick={() => handleDelete(block.id, block.name)} />
        <ThinkIconButton label={openId === block.id ? '收起' : '展开'} icon={<ThinkIcon name={openId === block.id ? 'chevron-up' : 'chevron-down'} />} size="sm" onClick={() => setOpenId(openId === block.id ? null : block.id)} />
      </div>
      {openId === block.id && <div className="think-block-accordion__details"><BlockEditor block={block} useCases={useCases} /></div>}
    </div>
  );
}

function BlockEditor({ block, useCases }: { block: RecordCaptureTemplate; useCases: UseCases }) {
  const [localBlock, setLocalBlock] = useState(block);
  useEffect(() => { setLocalBlock(block); }, [block]);
  const handleUpdate = (updates: Partial<RecordCaptureTemplate>) => { useCases.blocks.updateBlock(block.id, updates); };
  const handleBlur = (key: keyof RecordCaptureTemplate) => { if (localBlock[key] !== block[key]) handleUpdate({ [key]: localBlock[key] }); };
  return (
    <div className="think-block-editor think-settings-stack think-settings-stack--tight">
      <div className="think-settings-row"><span className="think-settings-row__label">名称</span><ThinkInput value={localBlock.name} onInput={(e) => setLocalBlock((current) => ({ ...current, name: (e.currentTarget as HTMLInputElement).value }))} onBlur={() => handleBlur('name')} /></div>
      <div className="think-settings-row"><span className="think-settings-row__label">默认分类</span><ThinkInput value={localBlock.categoryKey || ''} onInput={(e) => setLocalBlock((current) => ({ ...current, categoryKey: (e.currentTarget as HTMLInputElement).value }))} onBlur={() => handleBlur('categoryKey')} placeholder="例如：思考、计划、总结、打卡" /></div>
      <div className="think-settings-row"><span className="think-settings-row__label">目标文件</span><ThinkInput value={localBlock.targetFile} onInput={(e) => setLocalBlock((current) => ({ ...current, targetFile: (e.currentTarget as HTMLInputElement).value }))} onBlur={() => handleBlur('targetFile')} placeholder="{{themePath}}/{{标题.value}}.md" /></div>
      <div className="think-settings-row"><span className="think-settings-row__label">追加标题</span><ThinkInput value={localBlock.appendUnderHeader || ''} onInput={(e) => setLocalBlock((current) => ({ ...current, appendUnderHeader: (e.currentTarget as HTMLInputElement).value }))} onBlur={() => handleBlur('appendUnderHeader')} placeholder="## {{themePath}}" /></div>
      <section className="think-settings-section think-settings-section--flat"><h3 className="think-settings-subheading">表单字段</h3><FieldsEditor fields={localBlock.fields} onChange={(fields) => handleUpdate({ fields })} /></section>
    </div>
  );
}

const ENERGY_RECORD_TYPE_ID = '__energy-record-type__';

export function BlockManager() {
  const blocks = useSelector(selectInputBlocks); const [openId, setOpenId] = useState<string | null>(null); const useCases = useUseCases();
  const handleAdd = async () => { const newBlock = await useCases.blocks.addBlock(`新记录类型 ${blocks.length + 1}`); if (newBlock) setOpenId(newBlock.id); };
  const handleDelete = async (id: string, name: string) => { if (confirm(`确认删除记录类型 "${name}" 吗？\n相关预设会一起删除。`)) await useCases.blocks.deleteBlock(id); };
  const handleDuplicate = async (id: string) => { await useCases.blocks.duplicateBlock(id); };
  const handleDragEnd = (event: any) => { const { active, over } = event; if (active && over && active.id !== over.id) useCases.blocks.reorderBlocks(active.id, over.id); };
  return (
    <section className="think-block-manager think-settings-section">
      <div className="think-management-toolbar think-block-manager__toolbar">
        <span className="think-settings-caption">{blocks.length + 1} 个记录类型</span>
        <ThinkButton size="sm" variant="secondary" leadingIcon={<ThinkIcon name="plus" />} onClick={handleAdd}>新增记录类型</ThinkButton>
      </div>
      <div className="think-block-manager__list">
        <div className="think-block-accordion think-block-accordion--builtin">
          <div className="think-block-accordion__summary">
            <span className="think-block-accordion__drag think-block-accordion__drag--placeholder" aria-hidden="true"><ThinkIcon name="grip-vertical" /></span>
            <button type="button" className="think-block-accordion__title" onClick={() => setOpenId(openId === ENERGY_RECORD_TYPE_ID ? null : ENERGY_RECORD_TYPE_ID)}>精力</button>
            <span className="think-block-accordion__meta">直接记录</span>
            <ThinkIconButton label={openId === ENERGY_RECORD_TYPE_ID ? '收起' : '展开'} icon={<ThinkIcon name={openId === ENERGY_RECORD_TYPE_ID ? 'chevron-up' : 'chevron-down'} />} size="sm" onClick={() => setOpenId(openId === ENERGY_RECORD_TYPE_ID ? null : ENERGY_RECORD_TYPE_ID)} />
          </div>
          {openId === ENERGY_RECORD_TYPE_ID && <div className="think-block-accordion__details"><EnergyRecordTypeSettings /></div>}
        </div>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
            {blocks.map((block) => <SortableBlockItem key={block.id} block={block} openId={openId} setOpenId={setOpenId} handleDelete={handleDelete} handleDuplicate={handleDuplicate} useCases={useCases} />)}
          </SortableContext>
        </DndContext>
      </div>
    </section>
  );
}
