/** @jsxImportSource preact */
import { h } from 'preact';
import { ThinkButton, ThinkCheckbox, ThinkDisclosure, ThinkNotice } from '@shared/ui/public';
import type { AiScopeSectionProps } from './aiSettingsUiTypes';

export function AiScopeSection({ settings, blocks, onUpdate: _onUpdate, staleEnabledBlockIds = [], onInitAllBlocks, onClearStaleBlockIds, onToggleBlock }: AiScopeSectionProps) {
  return (
    <ThinkDisclosure title="Block 参与范围">
      <div className="think-settings-stack think-settings-stack--tight">
        <div className="think-settings-actions think-settings-actions--start">
          <ThinkButton variant="secondary" size="sm" onClick={onInitAllBlocks}>全部记录类型</ThinkButton>
          {staleEnabledBlockIds.length > 0 && onClearStaleBlockIds && <ThinkButton variant="secondary" size="sm" onClick={onClearStaleBlockIds}>清理旧 Block ID</ThinkButton>}
        </div>
        {staleEnabledBlockIds.length > 0 && <ThinkNotice tone="warning">AI 范围中有 {staleEnabledBlockIds.length} 个已失效 Block ID。</ThinkNotice>}
        <div className="think-ai-scope-list">
          {blocks.map((block) => <ThinkCheckbox key={block.id} checked={(settings.enabledBlockIds ?? []).length === 0 || (settings.enabledBlockIds ?? []).includes(block.id)} onChange={() => onToggleBlock(block.id)} label={block.name} compact />)}
        </div>
        {blocks.length === 0 && <div className="think-settings-caption">暂无 Block 模板。</div>}
      </div>
    </ThinkDisclosure>
  );
}
