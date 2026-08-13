/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { SettingsNavigation } from '@features/settings/components/SettingsNavigation';
import { BlockManager } from '@features/settings/input/BlockManager';
import { GoalManager } from '@features/settings/input/GoalManager';
import { GoalMetricSection } from '@features/settings/input/goalManager/GoalMetricSection';
import { ThemeMetadataManager } from '@features/settings/data/ThemeMetadataManager';

type DataSection = 'recordTypes' | 'goals' | 'themes' | 'metrics';
const sections: Array<{ value: DataSection; label: string }> = [
  { value: 'recordTypes', label: '记录类型' },
  { value: 'goals', label: '目标' },
  { value: 'themes', label: '主题' },
  { value: 'metrics', label: '指标' },
];

export function DataManagementSettings() {
  const [section, setSection] = useState<DataSection>('goals');
  return (
    <div className="think-settings-page think-settings-page--wide think-data-management">
      <SettingsNavigation
        label="数据管理"
        variant="secondary"
        value={section}
        options={sections}
        onChange={setSection}
        className="think-data-management-nav"
      />
      <div className="think-data-management__content">
        {section === 'recordTypes' && <BlockManager />}
        {section === 'goals' && <GoalManager />}
        {section === 'themes' && <ThemeMetadataManager />}
        {section === 'metrics' && <GoalMetricSection />}
      </div>
    </div>
  );
}
