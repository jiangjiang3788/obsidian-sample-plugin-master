/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, Button, Divider, Typography } from '@shared/public';
import { GoalManager } from '@features/settings/input/GoalManager';
import { ThemeMetadataManager } from '@features/settings/data/ThemeMetadataManager';

type DataSection = 'goals' | 'themes';

/**
 * 数据管理页：管理目标和主题元数据。
 * 插件内不再提供数据迁移入口；data.json / Markdown 迁移由离线文件处理完成。
 */
export function DataManagementSettings() {
  const [section, setSection] = useState<DataSection>('goals');
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ maxWidth: 1040, mx: 'auto', width: '100%', display: 'grid', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>数据管理</Typography>
        <Typography variant="body2" color="text.secondary">
          数据管理只维护目标和主题元数据。快速输入只负责写记录；默认记录方式来自 Block；目标只在需要多种写法时添加记录预设。主题只提供图标、颜色和领域路径。
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button variant={section === 'goals' ? 'contained' : 'outlined'} size="small" onClick={() => setSection('goals')}>目标中心</Button>
          <Button variant={section === 'themes' ? 'contained' : 'outlined'} size="small" onClick={() => setSection('themes')}>主题管理</Button>
        </Box>
      </Box>
      <Divider sx={{ mx: 'auto', maxWidth: 1040, width: '100%' }} />
      {section === 'goals' ? <GoalManager /> : <ThemeMetadataManager />}
    </Box>
  );
}
