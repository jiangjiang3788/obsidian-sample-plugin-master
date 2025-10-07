# Settings (设置系统) 功能模块

## 概述

Settings 模块为 Think OS 插件提供完整的配置管理界面，允许用户自定义插件的各个方面。该模块基于 Obsidian 的设置标签系统，使用 Preact 组件构建了丰富的设置界面。

## 目录结构

```
src/features/settings/
├── index.ts                    # 模块入口
└── ui/                         # UI 组件
    ├── SettingsTab.tsx         # 设置标签主组件
    ├── GeneralSettings.tsx     # 通用设置
    ├── ThemeMatrix.tsx         # 主题矩阵设置
    ├── DataSourceSettings.tsx  # 数据源设置
    ├── InputSettings.tsx       # 输入设置
    ├── LayoutSettings.tsx      # 布局设置
    ├── BlockManager.tsx        # 块管理器
    ├── ViewInstanceSettings.tsx # 视图实例设置
    ├── components/             # 通用组件
    ├── hooks/                  # React hooks
    └── ThemeMatrix/           # 主题矩阵子模块
```

## 核心功能

### 1. SettingsTab (设置标签)

主设置界面容器，管理所有设置面板。

**功能特性：**
- 集成到 Obsidian 设置界面
- 管理多个设置分区
- 响应式状态更新

### 2. GeneralSettings (通用设置)

基础配置选项。

**配置项：**
- 语言设置
- 默认行为
- 快捷键绑定
- 通知偏好

### 3. ThemeMatrix (主题矩阵)

高级主题管理系统。

**核心功能：**
- 主题预览和切换
- 自定义主题创建
- 主题导入/导出
- 实时预览

### 4. DataSourceSettings (数据源设置)

数据源和同步配置。

**配置项：**
- 数据源路径
- 同步频率
- 缓存策略
- 数据过滤规则

### 5. InputSettings (输入设置)

快速输入和命令配置。

**功能：**
- 快捷键映射
- 命令别名
- 输入模板
- 自动完成设置

### 6. LayoutSettings (布局设置)

界面布局和显示选项。

**配置项：**
- 面板布局
- 视图模式
- 工具栏配置
- 侧边栏选项

### 7. BlockManager (块管理器)

管理自定义代码块和渲染器。

**功能：**
- 注册自定义块类型
- 配置渲染选项
- 管理块模板
- 预览设置

### 8. ViewInstanceSettings (视图实例设置)

管理不同视图的实例配置。

**功能：**
- 视图配置管理
- 实例创建/删除
- 参数调整
- 预设管理

## 依赖关系

```typescript
export interface SettingsDependencies {
    app: App;              // Obsidian 应用实例
    plugin: ThinkPlugin;   // 插件实例
    appStore: AppStore;    // 应用状态存储
}
```

## 组件架构

### 基础组件结构

```typescript
// 设置组件基础接口
interface SettingsComponentProps {
    plugin: ThinkPlugin;
    appStore: AppStore;
}

// 设置项组件示例
export const SettingItem: FunctionalComponent<{
    name: string;
    desc: string;
    value: any;
    onChange: (value: any) => void;
}> = ({ name, desc, value, onChange }) => {
    return (
        <div className="setting-item">
            <div className="setting-item-info">
                <div className="setting-item-name">{name}</div>
                <div className="setting-item-description">{desc}</div>
            </div>
            <div className="setting-item-control">
                {/* 控件实现 */}
            </div>
        </div>
    );
};
```

## 使用示例

### 初始化设置模块

```typescript
import { setup } from '@features/settings';

// 在插件启动时初始化
const dependencies = {
    app: this.app,
    plugin: this,
    appStore: container.resolve(AppStore)
};

setup(dependencies);
```

### 添加自定义设置项

```typescript
// 在 SettingsTab 中添加自定义设置
export class SettingsTab extends PluginSettingTab {
    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        
        // 添加标题
        containerEl.createEl('h2', { text: 'Think OS 设置' });
        
        // 渲染设置组件
        render(
            <SettingsContainer 
                plugin={this.plugin} 
                appStore={this.plugin.appStore}
            />,
            containerEl
        );
    }
}
```

### 创建设置组件

```typescript
import { FunctionalComponent } from 'preact';
import { useState, useEffect } from 'preact/hooks';

export const CustomSettings: FunctionalComponent<SettingsComponentProps> = ({
    plugin,
    appStore
}) => {
    const [settings, setSettings] = useState(appStore.getState());
    
    useEffect(() => {
        const unsubscribe = appStore.subscribe((newState) => {
            setSettings(newState);
        });
        return () => unsubscribe();
    }, []);
    
    const handleChange = (key: string, value: any) => {
        appStore.setState({ [key]: value });
    };
    
    return (
        <div className="settings-section">
            <h3>自定义设置</h3>
            {/* 设置项 */}
        </div>
    );
};
```

## 状态管理

设置模块与 AppStore 紧密集成：

```typescript
// 读取设置
const currentTheme = appStore.getState().theme;

// 更新设置
appStore.setState({ theme: 'dark' });

// 监听设置变化
appStore.subscribe('theme', (newTheme) => {
    console.log('主题已更改为:', newTheme);
});
```

## 主题矩阵系统

ThemeMatrix 是一个高级主题管理系统：

### 功能特性

1. **主题树结构**
   - 层级化的主题组织
   - 主题继承和覆盖
   - 变体管理

2. **实时预览**
   - 即时应用主题更改
   - 预览窗口
   - 对比模式

3. **主题编辑器**
   - 可视化编辑
   - CSS 变量管理
   - 导入/导出功能

### 使用示例

```typescript
// 获取主题配置
const themeConfig = appStore.getState().themeMatrix;

// 应用主题
appStore.setState({
    themeMatrix: {
        activeTheme: 'custom-dark',
        themes: {
            'custom-dark': {
                name: '自定义深色',
                parent: 'dark',
                variables: {
                    '--background-primary': '#1a1a1a',
                    '--text-normal': '#e0e0e0'
                }
            }
        }
    }
});
```

## 性能优化

1. **懒加载**：设置面板按需加载
2. **防抖处理**：输入设置使用防抖避免频繁更新
3. **虚拟滚动**：长列表使用虚拟滚动提升性能
4. **缓存策略**：设置值缓存，减少读取开销

## 扩展指南

### 添加新的设置面板

1. 创建设置组件：
```typescript
// src/features/settings/ui/MySettings.tsx
export const MySettings: FunctionalComponent<SettingsComponentProps> = (props) => {
    // 实现设置界面
};
```

2. 在 SettingsTab 中注册：
```typescript
// src/features/settings/ui/SettingsTab.tsx
import { MySettings } from './MySettings';

// 在 display() 方法中添加
<MySettings plugin={this.plugin} appStore={this.appStore} />
```

### 自定义设置控件

```typescript
// 创建自定义控件
export const ColorPicker: FunctionalComponent<{
    value: string;
    onChange: (color: string) => void;
}> = ({ value, onChange }) => {
    return (
        <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.currentTarget.value)}
        />
    );
};
```

## 测试

```typescript
// 设置组件测试示例
describe('ThemeMatrix', () => {
    it('should apply theme changes', () => {
        const mockStore = createMockStore();
        const { getByTestId } = render(
            <ThemeMatrix plugin={mockPlugin} appStore={mockStore} />
        );
        
        const themeSelector = getByTestId('theme-selector');
        fireEvent.change(themeSelector, { target: { value: 'dark' } });
        
        expect(mockStore.getState().theme).toBe('dark');
    });
});
```

## 常见问题

### Q: 设置没有保存怎么办？

A: 确保：
- AppStore 正确初始化
- 设置变更触发了 `setState` 调用
- 插件的 `saveData` 方法被调用

### Q: 如何添加设置验证？

A: 在设置组件中添加验证逻辑：
```typescript
const handleChange = (value: string) => {
    if (validateInput(value)) {
        appStore.setState({ setting: value });
    } else {
        // 显示错误提示
    }
};
```

### Q: 如何实现设置的导入/导出？

A: 使用 AppStore 的序列化功能：
```typescript
// 导出
const settings = JSON.stringify(appStore.getState());

// 导入
const imported = JSON.parse(settingsJson);
appStore.setState(imported);
```

## 相关文档

- [状态管理](../state-management.md)
- [Preact 组件开发规范](../Preact组件开发规范.md)
- [主题系统重构报告](../ThemeMatrix重构_Phase1完成报告.md)

---

*最后更新: 2024-10-07*
