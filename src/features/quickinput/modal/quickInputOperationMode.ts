export type QuickInputOperationMode = 'create' | 'edit' | 'convert' | 'duplicate';

export function isQuickInputUpdateOperation(mode: QuickInputOperationMode): boolean {
  return mode === 'edit' || mode === 'convert';
}

export function isQuickInputCreateOperation(mode: QuickInputOperationMode): boolean {
  return mode === 'create' || mode === 'duplicate';
}

export function getQuickInputSubmitLabel(mode: QuickInputOperationMode, pending: boolean): string {
  if (pending) {
    switch (mode) {
      case 'edit':
        return '保存中...';
      case 'convert':
        return '转换中...';
      case 'duplicate':
        return '另存中...';
      case 'create':
      default:
        return '创建中...';
    }
  }

  switch (mode) {
    case 'edit':
      return '保存修改';
    case 'convert':
      return '转换并保存';
    case 'duplicate':
      return '另存为新记录';
    case 'create':
    default:
      return '创建';
  }
}

export function getQuickInputFailureMessage(mode: QuickInputOperationMode): string {
  switch (mode) {
    case 'edit':
      return '保存修改失败';
    case 'convert':
      return '转换记录类型失败';
    case 'duplicate':
      return '另存为新记录失败';
    case 'create':
    default:
      return '创建失败';
  }
}

export function getQuickInputSuccessNotice(mode: QuickInputOperationMode, existingNotice?: string | null): string | null {
  if (mode === 'duplicate') return '✅ 已另存为新记录';
  if (mode === 'convert') {
    const notice = String(existingNotice || '').trim();
    return notice.includes('迁移保存') || notice.includes('已迁移保存') ? notice : '✅ 已转换记录类型';
  }
  return null;
}

export function getQuickInputOperationTitle(
  mode: QuickInputOperationMode,
  _currentBlockName: string,
  isTimerCreate: boolean,
): string {
  // The modal title communicates the operation only. Record type belongs to the
  // form context row, so repeating it here creates two competing sources of state.
  switch (mode) {
    case 'edit':
      return '编辑记录';
    case 'convert':
      return '转换记录类型';
    case 'duplicate':
      return '另存为新记录';
    case 'create':
    default:
      return isTimerCreate ? '开始新任务' : '快速录入';
  }
}
