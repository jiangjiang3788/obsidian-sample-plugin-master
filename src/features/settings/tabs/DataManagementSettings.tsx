/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, Button, Divider, Typography } from '@shared/public';
import { BlockManager } from '@features/settings/input/BlockManager';
import { GoalManager } from '@features/settings/input/GoalManager';
import { GoalMetricSection } from '@features/settings/input/goalManager/GoalMetricSection';
import { ThemeMetadataManager } from '@features/settings/data/ThemeMetadataManager';

type DataSection = 'recordTypes' | 'goals' | 'themes' | 'metrics';

const sections: Array<{ key: DataSection; title: string }> = [
  { key: 'recordTypes', title: '记录类型' },
  { key: 'goals', title: '目标' },
  { key: 'themes', title: '主题' },
  { key: 'metrics', title: '指标' },
];

/** 数据管理：唯一维护记录类型、目标、主题和指标。 */
export function DataManagementSettings() {
  const [section, setSection] = useState<DataSection>('goals');
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <Box sx={{ maxWidth: 1040, mx: 'auto', width: '100%', display: 'grid', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>数据管理</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
          {sections.map((item) => (
            <Button
              key={item.key}
              variant={section === item.key ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSection(item.key)}
              sx={{ borderRadius: 999 }}
            >
              {item.title}
            </Button>
          ))}
        </Box>
      </Box>
      <Divider sx={{ mx: 'auto', maxWidth: 1040, width: '100%' }} />
      {section === 'recordTypes' && <BlockManager />}
      {section === 'goals' && <GoalManager />}
      {section === 'themes' && <ThemeMetadataManager />}
      {section === 'metrics' && (
        <Box sx={{ maxWidth: 1040, mx: 'auto', width: '100%' }}>
          <GoalMetricSection />
        </Box>
      )}
    </Box>
  );
}
