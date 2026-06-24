/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, Button, Typography } from '@shared/public';
import { FloatingPanel, closeFloatingWidget, openFloatingWidget, useUiPort, useUseCases } from '@/app/public';
import { GoalTemplateMatrix } from './GoalTemplateMatrix';

const WIDGET_ID = 'goal-preset-matrix';

function GoalPresetMatrixWidgetInner({ widgetId = WIDGET_ID }: { widgetId?: string }) {
  const useCases = useUseCases();
  const ui = useUiPort();
  const [cleanupText, setCleanupText] = useState('');
  const [cleaning, setCleaning] = useState(false);

  const handleCleanup = async () => {
    if (cleaning) return;
    setCleaning(true);
    try {
      const goalUseCase = useCases.goal as any;
      if (typeof goalUseCase.cleanupGoalSettingsStorage !== 'function') {
        ui.notice?.('当前版本还没有整理旧数据能力');
        return;
      }
      const result = await goalUseCase.cleanupGoalSettingsStorage();
      const parts = [
        `预设 ${result.beforeTemplateCount} → ${result.afterTemplateCount}`,
        result.removedDuplicateTemplates ? `去重 ${result.removedDuplicateTemplates}` : '',
        result.removedDanglingCycles ? `清理周期 ${result.removedDanglingCycles}` : '',
        result.removedDanglingRelations ? `清理关系 ${result.removedDanglingRelations}` : '',
      ].filter(Boolean);
      const message = result.changed ? `已整理：${parts.join('，')}` : '预设数据已经是干净状态';
      setCleanupText(message);
      ui.notice?.(message);
    } finally {
      setCleaning(false);
    }
  };

  return (
    <FloatingPanel
      id={widgetId}
      title="记录预设"
      defaultPosition={{ x: Math.max(24, window.innerWidth / 2 - 560), y: 72 }}
      width={1120}
      height={720}
      minWidth={760}
      minHeight={520}
      maxWidth="96vw"
      maxHeight="92vh"
      resizable
      bodyPadding={12}
      bodyStyle={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}
      onClose={() => closeFloatingWidget(widgetId)}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Typography variant="body2" color="text.secondary">目标 × 记录类型。单元格里的卡片就是快捷输入可用的记录预设。</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          {cleanupText ? <Typography variant="caption" color="text.secondary">{cleanupText}</Typography> : null}
          <Button size="small" variant="outlined" onClick={handleCleanup} disabled={cleaning}>{cleaning ? '整理中…' : '整理旧数据'}</Button>
        </Box>
      </Box>
      <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <GoalTemplateMatrix />
      </Box>
    </FloatingPanel>
  );
}

/** 打开目标 × 记录类型预设矩阵。renderFn 只返回 vnode，不在这里调用 hooks。 */
export function openGoalPresetMatrixWidget() {
  return openFloatingWidget(WIDGET_ID, () => <GoalPresetMatrixWidgetInner widgetId={WIDGET_ID} />);
}

export default GoalPresetMatrixWidgetInner;
