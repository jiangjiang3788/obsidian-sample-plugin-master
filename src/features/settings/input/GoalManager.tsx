/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import { Box, Button, Chip, Divider, Typography } from '@shared/public';
import { selectSettings, useSelector } from '@/app/public';
import { getGoalTemplates } from '@core/public';
import { GoalEntitySection } from './goalManager/GoalEntitySection';
import { GoalMetricSection } from './goalManager/GoalMetricSection';
import { GoalTemplateSection } from './goalManager/GoalTemplateSection';

type GoalCenterSection = 'goals' | 'presets' | 'metrics';

const sections: Array<{ key: GoalCenterSection; title: string; description: string }> = [
  { key: 'goals', title: '目标', description: '新建和整理目标。' },
  { key: 'presets', title: '预设表', description: '用表格管理目标 × Block，每个单元格可有多个预设。' },
  { key: 'metrics', title: '指标', description: '给目标设置完成标准。' },
];

/**
 * 数据管理里的目标中心外壳。
 * P9 减法重构：目标中心先服务用户任务；Goal x Block x Template 只是底层能力。
 */
export function GoalManager() {
  const settings = useSelector(selectSettings);
  const [section, setSection] = useState<GoalCenterSection>('goals');

  const goals = settings.goalSettings?.goals || [];
  const activeGoals = goals.filter((goal) => goal.status !== 'archived');
  const goalTemplates = getGoalTemplates(settings.goalSettings);

  const currentSection = sections.find((item) => item.key === section) || sections[0];

  return (
    <Box sx={{ maxWidth: 1040, mx: 'auto', display: 'grid', gap: 2 }}>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Box sx={{ minWidth: 260 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>目标中心</Typography>
            <Typography variant="body2" color="text.secondary">
              目标只管理“我要追踪什么”；预设在“目标 × Block 预设表”的单元格里直接管理，不再另开独立预设页。
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, justifyContent: 'flex-end' }}>
            <Chip label={`目标 ${activeGoals.length}`} size="small" color={activeGoals.length > 0 ? 'primary' : 'default'} />
            <Chip label={`预设 ${goalTemplates.length}`} size="small" />
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'inline-flex',
          gap: 0.5,
          p: 0.5,
          border: '1px solid var(--background-modifier-border)',
          borderRadius: 999,
          background: 'var(--background-secondary)',
          width: 'fit-content',
          maxWidth: '100%',
          flexWrap: 'wrap',
        }}
      >
        {sections.map((item) => (
          <Button
            key={item.key}
            size="small"
            variant={section === item.key ? 'contained' : 'text'}
            onClick={() => setSection(item.key)}
            sx={{ borderRadius: 999 }}
          >
            {item.title}
          </Button>
        ))}
      </Box>

      <Box>
        <Typography sx={{ fontWeight: 800 }}>{currentSection.title}</Typography>
        <Typography variant="caption" color="text.secondary">{currentSection.description}</Typography>
      </Box>

      {section === 'goals' && <GoalEntitySection />}
      {section === 'presets' && <GoalTemplateSection />}
      {section === 'metrics' && <GoalMetricSection />}

      <Divider />
    </Box>
  );
}
