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
    <Box className="think-settings-page think-settings-page--wide">
      <Box className="think-settings-stack think-settings-full-width">
        <Typography variant="h5" className="think-settings-page__title">数据管理</Typography>
        <Box className="think-settings-nav">
          {sections.map((item) => (
            <Button
              key={item.key}
              variant={section === item.key ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSection(item.key)}

            >
              {item.title}
            </Button>
          ))}
        </Box>
      </Box>
      <Divider className="think-settings-full-width" />
      {section === 'recordTypes' && <BlockManager />}
      {section === 'goals' && <GoalManager />}
      {section === 'themes' && <ThemeMetadataManager />}
      {section === 'metrics' && (
        <Box className="think-settings-full-width">
          <GoalMetricSection />
        </Box>
      )}
    </Box>
  );
}
