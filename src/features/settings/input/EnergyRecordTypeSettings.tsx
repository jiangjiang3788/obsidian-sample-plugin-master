/** @jsxImportSource preact */
import { h } from 'preact';
import { selectEnergyDefaultGoalId, selectEnergyDefaultThemePath, selectInputThemes, selectSettings, useSelector, useUseCases } from '@/app/public';
import { SimpleSelect } from '@shared/ui/public';

export function EnergyRecordTypeSettings() {
  const settings = useSelector(selectSettings);
  const themes = useSelector(selectInputThemes);
  const defaultGoalId = useSelector(selectEnergyDefaultGoalId);
  const defaultThemePath = useSelector(selectEnergyDefaultThemePath);
  const useCases = useUseCases();
  const goals = (settings.goalSettings?.goals || []).filter((goal) => goal.status !== 'archived');
  const goalOptions = [{ value: '', label: '自动选择第一个活跃目标' }, ...goals.map((goal) => ({ value: goal.id, label: goal.goalPath || goal.title }))];
  const themeOptions = [{ value: '', label: '不指定默认主题' }, ...themes.filter((theme) => theme.status !== 'inactive').map((theme) => ({ value: theme.path, label: `${theme.icon || '•'} ${theme.path}` }))];
  return (
    <div className="think-settings-stack think-settings-stack--tight">
      <div className="think-settings-row"><span className="think-settings-row__label">默认目标</span><SimpleSelect value={defaultGoalId} options={goalOptions} onChange={(value) => void useCases.settings.setEnergyDefaultGoalId(value || null)} fullWidth /></div>
      <div className="think-settings-row"><span className="think-settings-row__label">默认主题</span><SimpleSelect value={defaultThemePath} options={themeOptions} onChange={(value) => void useCases.settings.setEnergyDefaultThemePath(value || null)} fullWidth /></div>
    </div>
  );
}
