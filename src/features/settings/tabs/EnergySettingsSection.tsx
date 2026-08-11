/** @jsxImportSource preact */
import { h } from 'preact';
import {
  selectEnergyDefaultGoalId,
  selectEnergyDefaultThemePath,
  selectInputThemes,
  selectSettings,
  useSelector,
  useUseCases,
} from '@/app/public';
import { SimpleSelect, Typography } from '@shared/ui/public';

export function EnergySettingsSection() {
  const settings = useSelector(selectSettings);
  const themes = useSelector(selectInputThemes);
  const defaultGoalId = useSelector(selectEnergyDefaultGoalId);
  const defaultThemePath = useSelector(selectEnergyDefaultThemePath);
  const useCases = useUseCases();
  const goals = (settings.goalSettings?.goals || []).filter((goal) => goal.status !== 'archived');
  const goalOptions = [
    { value: '', label: '自动选择第一个活跃目标' },
    ...goals.map((goal) => ({ value: goal.id, label: goal.goalPath || goal.title })),
  ];
  const themeOptions = [
    { value: '', label: '不指定默认主题' },
    ...themes
      .filter((theme) => theme.status !== 'inactive')
      .map((theme) => ({ value: theme.path, label: `${theme.icon || '•'} ${theme.path}` })),
  ];

  return (
    <section className="think-settings-section">
      <div className="think-settings-section__header">
        <div>
          <h2 className="think-settings-section__title">精力记录默认值</h2>
          <p className="think-settings-help">属于“记录类型”的默认数据，不属于 EnergyView。桌面快捷记录没有显式上下文时使用这里的目标与主题。</p>
        </div>
      </div>
      <div className="think-settings-field-stack">
        <Typography variant="body2">默认精力目标</Typography>
        <SimpleSelect
          value={defaultGoalId}
          options={goalOptions}
          onChange={(value) => void useCases.settings.setEnergyDefaultGoalId(value || null)}
          fullWidth
        />
        <Typography variant="body2">默认精力主题</Typography>
        <SimpleSelect
          value={defaultThemePath}
          options={themeOptions}
          onChange={(value) => void useCases.settings.setEnergyDefaultThemePath(value || null)}
          fullWidth
        />
        <Typography variant="body2" color="text.secondary">
          优先级：当前明确传入的主题 → 默认精力主题 → 当前目标主题。快捷录入默认不展示目标/主题表单，只在需要时展开目标修改。
        </Typography>
      </div>
    </section>
  );
}
