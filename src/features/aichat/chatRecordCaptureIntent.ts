const TASK_WORD = '(?:任务|task)';

/** Only route explicit create/write intentions into the existing AI batch-capture pipeline. */
export function isExplicitTaskCaptureRequest(text: string): boolean {
  const value = String(text || '').trim();
  if (!value) return false;
  if (/(?:不要|别|无需|不需要).{0,8}(?:创建|建立|生成|拆成|转成).{0,6}(?:任务|task)/i.test(value)) return false;
  const actionFirst = new RegExp(`(?:帮我|给我|请)?[^。\\n]{0,24}(?:创建|建立|新建|生成|拆成|拆分成|转成|转换成|做成|整理成|加入)[^。\\n]{0,12}${TASK_WORD}`, 'i');
  const taskFirst = new RegExp(`${TASK_WORD}[^。\\n]{0,12}(?:创建|建立|新建|生成|拆分|拆成|转成|转换)`, 'i');
  return actionFirst.test(value) || taskFirst.test(value);
}

export function buildTaskCaptureText(text: string, selectedGoalPath?: string | null): string {
  const goal = String(selectedGoalPath || '').trim();
  const rules = [
    '【录入要求】',
    '- 这是“创建任务”请求；可以返回多条，每一条 target.blockId 必须为 core.task。',
    '- 把 SOP/步骤拆成真正可执行的多个任务，不要把整段 SOP 只做成一条任务。',
  ];
  if (goal) rules.push(`- 所有任务使用目标路径：${goal}`);
  rules.push('【用户原话】', String(text || '').trim());
  return rules.join('\n');
}
