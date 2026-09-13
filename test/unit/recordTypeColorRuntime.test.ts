/**
 * @covers F110/unit
 */
import { applyRecordTypeColorOverrides, clearRecordTypeColorOverrides } from '@/app/presentation/RecordTypeColorRuntime';

describe('Record Type color runtime owner', () => {
  afterEach(() => clearRecordTypeColorOverrides());

  it('只把合法用户覆盖写入唯一 runtime style owner', () => {
    applyRecordTypeColorOverrides({ task: '#123456', thought: '#abcdef' });
    const style = document.getElementById('think-os-record-type-colors-runtime') as HTMLStyleElement | null;
    expect(style).not.toBeNull();
    expect(style?.dataset.thinkOwner).toBe('record-type-color-runtime');
    expect(style?.textContent).toContain('--think-record-type-task: #123456');
    expect(style?.textContent).toContain('--think-record-type-thought: #abcdef');
    expect(style?.textContent).not.toContain('task-session');
    expect(style?.textContent).not.toContain('task-series');
  });

  it('空覆盖直接移除 runtime owner，让产品 CSS 默认色重新接管', () => {
    applyRecordTypeColorOverrides({ task: '#123456' });
    expect(document.getElementById('think-os-record-type-colors-runtime')).not.toBeNull();
    applyRecordTypeColorOverrides({});
    expect(document.getElementById('think-os-record-type-colors-runtime')).toBeNull();
  });
});
