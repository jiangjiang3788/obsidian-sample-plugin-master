import type { TimelineViewConfig } from '../types';

export const TIMELINE_VIEW_DEFAULT_CONFIG: TimelineViewConfig = {
  defaultHourHeight: 50,
  MAX_HOURS_PER_DAY: 24,
  UNTRACKED_LABEL: '未记录',
  categories: {
    工作: { name: '工作', color: '#60a5fa', files: ['工作', 'Work'] },
    学习: { name: '学习', color: '#34d399', files: ['学习', 'Study'] },
    生活: { name: '生活', color: '#fbbf24', files: ['生活', 'Life'] },
  },
  progressOrder: ['工作', '学习', '生活'],
};
