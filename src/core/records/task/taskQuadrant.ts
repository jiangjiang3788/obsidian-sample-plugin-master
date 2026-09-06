import type { RecordViewItem, TaskImportance, TaskUrgency } from '../RecordEntity';

export type EisenhowerQuadrant = 'q1' | 'q2' | 'q3' | 'q4' | 'unclassified';

export interface TaskQuadrantPresentation {
  quadrant: EisenhowerQuadrant;
  emoji: string;
  label: string;
  shortLabel: string;
}

export const TASK_QUADRANT_PRESENTATION: Record<EisenhowerQuadrant, TaskQuadrantPresentation> = {
  q1: { quadrant: 'q1', emoji: '🔥', label: '紧急且重要', shortLabel: '紧急重要' },
  q2: { quadrant: 'q2', emoji: '🎯', label: '重要但不紧急', shortLabel: '重要不紧急' },
  q3: { quadrant: 'q3', emoji: '⚡', label: '紧急但不重要', shortLabel: '紧急不重要' },
  q4: { quadrant: 'q4', emoji: '🌿', label: '不紧急且不重要', shortLabel: '不紧急不重要' },
  unclassified: { quadrant: 'unclassified', emoji: '📥', label: '未分类', shortLabel: '未分类' },
};

export function normalizeTaskImportance(value: unknown): TaskImportance | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'important' || normalized === 'normal' ? normalized : null;
}

export function normalizeTaskUrgency(value: unknown): TaskUrgency | null {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'urgent' || normalized === 'normal' ? normalized : null;
}

export function deriveEisenhowerQuadrant(
  task: Pick<RecordViewItem, 'coreBlock' | 'importance' | 'urgency'> | null | undefined,
): EisenhowerQuadrant {
  if (!task || task.coreBlock !== 'task') return 'unclassified';
  const importance = normalizeTaskImportance(task.importance);
  const urgency = normalizeTaskUrgency(task.urgency);
  if (!importance || !urgency) return 'unclassified';
  if (importance === 'important' && urgency === 'urgent') return 'q1';
  if (importance === 'important' && urgency === 'normal') return 'q2';
  if (importance === 'normal' && urgency === 'urgent') return 'q3';
  return 'q4';
}

export function taskClassificationForQuadrant(quadrant: EisenhowerQuadrant): {
  importance: TaskImportance | null;
  urgency: TaskUrgency | null;
} {
  switch (quadrant) {
    case 'q1': return { importance: 'important', urgency: 'urgent' };
    case 'q2': return { importance: 'important', urgency: 'normal' };
    case 'q3': return { importance: 'normal', urgency: 'urgent' };
    case 'q4': return { importance: 'normal', urgency: 'normal' };
    default: return { importance: null, urgency: null };
  }
}
