/** @jsxImportSource preact */
import { h } from 'preact';
import { selectEnergyDefaultGoalPath, selectSettings, useSelector, useUseCases } from '@/app/public';
import { SimpleSelect } from '@shared/ui/public';

export function EnergySettingsSection() {
  const settings = useSelector(selectSettings);
  const defaultGoalPath = useSelector(selectEnergyDefaultGoalPath);
  const useCases = useUseCases();
  const goals = (settings.goalSettings?.goals || []).filter((goal) => goal.status !== 'archived');
  const goalOptions = [{ value: '', label: '自动选择第一个活跃目标' }, ...goals.map((goal) => ({ value: goal.path, label: goal.path }))];
  return (
    <section className="think-settings-section">
      <h2 className="think-settings-section__title">精力记录默认值</h2>
      <div className="think-settings-stack think-settings-stack--tight">
        <div className="think-settings-row"><span className="think-settings-row__label">默认目标</span><SimpleSelect value={defaultGoalPath} options={goalOptions} onChange={(value) => void useCases.settings.setEnergyDefaultGoalPath(value || null)} fullWidth /></div>
      </div>
    </section>
  );
}
