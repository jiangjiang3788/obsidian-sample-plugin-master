/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F002/integration
 */
import { FeatureRegistry } from '@/app/FeatureRegistry';
import { registerFeatureContributions } from '@/app/features/registerFeatureContributions';

describe('功能贡献统一注册组合', () => {
  it('中央注册入口一次性收拢 Dashboard、Whiteboard、Settings、QuickInput、AIInput，ID 不重复且启动模式符合职责', () => {
    const registry = new FeatureRegistry<any>();
    registerFeatureContributions(registry, {
      plugin: { app: {}, manifest: { id: 'think-os' }, addCommand: jest.fn(), register: jest.fn() } as any,
      eventsPort: {} as any,
      dataStore: {} as any,
      rendererService: {} as any,
      actionService: {} as any,
    });
    const features = registry.list();
    expect(features.map((feature) => feature.id)).toEqual(['dashboard', 'whiteboard', 'settings', 'quickinput', 'aiinput']);
    expect(new Set(features.map((feature) => feature.id)).size).toBe(features.length);
    expect(features.find((feature) => feature.id === 'dashboard')?.bootMode).toBe('blocking');
    // Whiteboard must register its Obsidian view synchronously before workspace restoration;
    // command/settings surfaces can boot in the background.
    expect(features.find((feature) => feature.id === 'whiteboard')?.bootMode).toBe('blocking');
    expect(features
      .filter((feature) => !['dashboard', 'whiteboard'].includes(feature.id))
      .every((feature) => feature.bootMode === 'background')).toBe(true);
  });
});
