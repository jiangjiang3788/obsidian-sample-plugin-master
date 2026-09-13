/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F072/integration
 */
import { AiNaturalLanguageRecordParser } from '@/core/ai/AiNaturalLanguageRecordParser';
import type { AiConfigCache } from '@/core/ai/AiConfigCache';
import type { AiHttpClient } from '@/core/ai/AiHttpClient';

const GOAL = '工作/Think OS';

function settingsProvider() {
  return {
    getSettings: () => ({
      aiSettings: {
        enabled: true,
        apiEndpoint: 'https://example.invalid/v1',
        apiKey: 'secret',
        model: 'test-model',
        temperature: 0.7,
        maxTokens: 4096,
        requestTimeoutMs: 30000,
        customPrompt: '',
        allowMultipleResults: false,
        maxResults: 5,
      },
      goalSettings: {},
    }),
  } as any;
}

describe('AI 自然语言解析完整编排', () => {
  it('设置、配置快照、HTTP JSON 与领域归一化按同一链路产出可提交记录', async () => {
    const cache = {
      getSnapshot: jest.fn(() => ({
        recordTypes: [{ id: 'core.task', name: '任务', recordTypeId: 'core.task' }],
        goals: [{ path: GOAL }],
        goalPresets: [{ id: 'gt-task', goalTemplateId: 'gt-task', goalPath: GOAL, recordTypeId: 'core.task' }],
      })),
    } as unknown as AiConfigCache;
    const http = {
      chatCompletion: jest.fn(async () => JSON.stringify({
        items: [
          { rawText: '', target: { recordTypeId: 'core.task', goalPath: GOAL }, fieldValues: { 内容: '完成测试体系', 目标: '不应保留' } },
          { rawText: '', target: { recordTypeId: 'core.task', goalPath: GOAL }, fieldValues: { 内容: '第二条' } },
        ],
      })),
    } as unknown as AiHttpClient;

    const parser = new AiNaturalLanguageRecordParser(settingsProvider(), cache, http);
    const result = await parser.parse({ text: '帮我记录完成测试体系', now: new Date('2026-08-24T10:00:00.000Z') });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].target).toMatchObject({
      recordTypeId: 'core.task', goalPath: GOAL, goalTemplateId: 'gt-task',
    });
    expect(result.items[0].fieldValues).toEqual({ 内容: '完成测试体系' });
    expect(http.chatCompletion).toHaveBeenCalledWith(expect.objectContaining({
      model: 'test-model',
      messages: expect.arrayContaining([expect.objectContaining({ role: 'user' })]),
    }));
  });
});
