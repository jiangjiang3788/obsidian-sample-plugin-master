/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F078/unit
 */
import { buildTaskCaptureText, isExplicitTaskCaptureRequest } from '@/features/aichat/chatRecordCaptureIntent';

describe('AI Chat → AI 快速记录任务意图', () => {
  it('识别明确的 SOP 多任务创建请求，但不会把普通讨论误判为写入', () => {
    expect(isExplicitTaskCaptureRequest('我看到一个学习 SOP，帮我拆成任务')).toBe(true);
    expect(isExplicitTaskCaptureRequest('帮我把这套 SOP 建立成任务')).toBe(true);
    expect(isExplicitTaskCaptureRequest('你觉得这个学习 SOP 好不好？')).toBe(false);
    expect(isExplicitTaskCaptureRequest('不要把这个 SOP 创建成任务')).toBe(false);
  });

  it('构造复用 AI 快速记录 parser 的多任务约束，并可固定当前目标', () => {
    const text = buildTaskCaptureText('把这个 SOP 拆成任务', '武装大脑');
    expect(text).toContain('可以返回多条');
    expect(text).toContain('target.blockId 必须为 core.task');
    expect(text).toContain('所有任务使用目标路径：武装大脑');
    expect(text).toContain('把这个 SOP 拆成任务');
  });
});
