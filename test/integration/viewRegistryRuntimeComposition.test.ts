/**
 * 测试覆盖声明（测试体系审计使用，不代表执行已通过）
 * @covers F080/integration
 * @covers F081/integration
 * @covers F082/integration
 * @covers F083/integration
 * @covers F084/integration
 * @covers F085/integration
 * @covers F086/integration
 * @covers F087/integration
 * @covers F088/integration
 */
import { VIEW_DEFINITIONS, VIEW_OPTIONS, getViewDefaultConfig } from '@core/view/public';
import { VIEW_RUNTIME_BINDINGS, getViewRuntimeComponent } from '@/features/views/registry';

describe('十种 View 的注册表 → 默认配置 → Runtime 绑定组合契约', () => {
  it('十种内建 View 在唯一注册表、默认配置和 Runtime 组件之间一一对应', () => {
    expect(VIEW_OPTIONS).toHaveLength(10);
    expect(Object.keys(VIEW_RUNTIME_BINDINGS).sort()).toEqual([...VIEW_OPTIONS].sort());
    for (const viewType of VIEW_OPTIONS) {
      expect(VIEW_DEFINITIONS[viewType].label.trim()).not.toBe('');
      expect(getViewDefaultConfig(viewType)).toEqual(VIEW_DEFINITIONS[viewType].defaultConfig);
      expect(getViewRuntimeComponent(viewType)).toBe(VIEW_RUNTIME_BINDINGS[viewType]);
      expect(typeof getViewRuntimeComponent(viewType)).toBe('function');
    }
  });
});
