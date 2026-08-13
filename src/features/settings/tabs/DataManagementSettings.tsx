/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, ThinkSegmentedControl, Typography } from '@shared/ui/public';
import { BlockManager } from '@features/settings/input/BlockManager';
import { GoalManager } from '@features/settings/input/GoalManager';
import { GoalMetricSection } from '@features/settings/input/goalManager/GoalMetricSection';
import { ThemeMetadataManager } from '@features/settings/data/ThemeMetadataManager';
import { EnergySettingsSection } from './EnergySettingsSection';

type DataSection = 'recordTypes' | 'goals' | 'themes' | 'metrics';

const sections: Array<{ value: DataSection; label: string }> = [
  { value: 'recordTypes', label: '记录类型' },
  { value: 'goals', label: '目标' },
  { value: 'themes', label: '主题' },
  { value: 'metrics', label: '指标' },
];

/** 数据管理：唯一维护记录类型、目标、主题和指标。 */
export function DataManagementSettings() {
  const [section, setSection] = useState<DataSection>('goals');

  return (
    <Box className="think-settings-page think-settings-page--wide">
      <Box className="think-settings-page__header think-settings-full-width">
        <Typography variant="h5" className="think-settings-page__title">数据管理</Typography>
        <ThinkSegmentedControl
          label="数据管理分类"
          value={section}
          options={sections}
          onChange={(value) => setSection(value as DataSection)}
          size="sm"
          className="think-data-management-nav"
        />
      </Box>

      <Box className="think-settings-full-width">
        {section === 'recordTypes' && (
          <Box className="think-settings-stack think-settings-full-width">
            <EnergySettingsSection />
            <BlockManager />
          </Box>
        )}
        {section === 'goals' && <GoalManager />}
        {section === 'themes' && <ThemeMetadataManager />}
        {section === 'metrics' && (
          <Box className="think-settings-full-width">
            <GoalMetricSection />
          </Box>
        )}
      </Box>
    </Box>
  );
}
