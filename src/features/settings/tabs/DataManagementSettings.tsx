/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { ThinkSegmentedControl } from '@shared/ui/public';
import { BlockManager } from '@features/settings/input/BlockManager';
import { GoalManager } from '@features/settings/input/GoalManager';
import { GoalMetricSection } from '@features/settings/input/goalManager/GoalMetricSection';
import { ThemeMetadataManager } from '@features/settings/data/ThemeMetadataManager';
import { EnergySettingsSection } from './EnergySettingsSection';

type DataSection = 'recordTypes' | 'goals' | 'themes' | 'metrics';
const sections: Array<{ value: DataSection; label: string }> = [
  { value: 'recordTypes', label: '记录类型' }, { value: 'goals', label: '目标' }, { value: 'themes', label: '主题' }, { value: 'metrics', label: '指标' },
];

export function DataManagementSettings() {
  const [section, setSection] = useState<DataSection>('goals');
  return (
    <div className="think-settings-page think-settings-page--wide">
      <header className="think-settings-page__header think-settings-full-width">
        <h1 className="think-settings-page__title">数据管理</h1>
        <ThinkSegmentedControl label="数据管理分类" value={section} options={sections} onChange={(value) => setSection(value as DataSection)} size="sm" className="think-data-management-nav" />
      </header>
      <div className="think-settings-full-width">
        {section === 'recordTypes' && <div className="think-settings-stack think-settings-full-width"><EnergySettingsSection /><BlockManager /></div>}
        {section === 'goals' && <GoalManager />}
        {section === 'themes' && <ThemeMetadataManager />}
        {section === 'metrics' && <GoalMetricSection />}
      </div>
    </div>
  );
}
