/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F056/integration
 * @covers F065/integration
 * @covers F065/persistence
 */
import { RecordInputUseCase } from '@/app/usecases/recordInput.usecase';

function makeUseCase() {
  const linkEnergySnapshot = jest.fn(async () => null);
  const inputService = {
    appendDirectRecord: jest.fn(async () => '01/目标精力.md'),
  };
  const dataStore = {
    scanFileByPath: jest.fn(async () => []),
    notifyChange: jest.fn(),
  };
  const itemService = { linkEnergySnapshot };
  const useCase = new RecordInputUseCase({} as never, {
    inputService, itemService, dataStore,
  } as never);
  return { useCase, linkEnergySnapshot };
}

const base = {
  goalPath: '爱好能力/武装大脑',
  date: '2026-08-29',
  time: '09:30',
  captureMode: 'realtime' as const,
  timePrecision: 'exact' as const,
  scoreMode: 'percent' as const,
  score: 70,
};

describe('Timer Energy snapshot linking boundary', () => {
  it('before sample can explicitly skip finished-Session linking', async () => {
    const { useCase, linkEnergySnapshot } = makeUseCase();
    const result = await useCase.submitEnergySnapshot({
      ...base,
      source: 'timer-energy-start',
      linkFinishedSession: false,
    });

    expect(result.status).toBe('success');
    expect(linkEnergySnapshot).not.toHaveBeenCalled();
  });

  it('after sample keeps the canonical Energy → finished TaskSession linker', async () => {
    const { useCase, linkEnergySnapshot } = makeUseCase();
    const result = await useCase.submitEnergySnapshot({
      ...base,
      source: 'timer-energy-end',
      linkFinishedSession: true,
    });

    expect(result.status).toBe('success');
    expect(linkEnergySnapshot).toHaveBeenCalledWith(result.affectedRecordId);
  });
});
