# 快速输入功能文档

## 📋 概述

快速输入（Quick Input）是 Think OS 插件的核心功能之一，提供了一个高效的数据录入界面，支持快捷键调用、智能解析和自动补全功能。

## ✨ 功能特性

### 核心功能
- **快捷键调用** - `Ctrl/Cmd + Shift + I` 快速打开输入面板
- **智能解析** - 自动识别主题（#）和标签（@）
- **自动补全** - 基于历史记录的智能建议
- **实时预览** - 输入时实时显示解析结果
- **批量输入** - 支持一次输入多条数据
- **历史记录** - 保存最近的输入历史

### 输入语法

```
基本格式：内容 #主题 @标签1 @标签2

示例：
- 完成项目文档 #工作/项目A @重要 @本周
- 学习 TypeScript #个人/学习 @技术
- 会议记录 #工作/会议 @2025-01-07
```

## 🏗️ 架构设计

### 模块结构

```
src/features/quick-input/
├── components/              # UI 组件
│   ├── QuickInputModal.tsx  # 主模态框
│   ├── InputField.tsx       # 输入框组件
│   ├── SuggestionList.tsx   # 建议列表
│   └── ParsePreview.tsx     # 解析预览
├── hooks/                   # 自定义 Hooks
│   ├── useQuickInput.ts     # 快速输入逻辑
│   ├── useAutoComplete.ts   # 自动补全
│   └── useInputHistory.ts   # 历史记录
├── services/                # 业务服务
│   ├── QuickInputService.ts # 主服务
│   ├── InputParser.ts       # 输入解析器
│   └── HistoryManager.ts    # 历史管理
├── types/                   # 类型定义
│   └── index.ts
└── index.ts                 # 模块导出
```

### 数据流

```
用户输入 → InputParser 解析 → 实时预览
    ↓
自动补全建议 ← HistoryManager
    ↓
确认提交 → QuickInputService → DataSourceService
    ↓
保存历史 → 更新状态 → 关闭模态框
```

## 💻 API 参考

### QuickInputService

主要的业务服务类，处理快速输入的核心逻辑。

```typescript
@injectable()
export class QuickInputService {
    constructor(
        @inject('DataSourceService') private dataService: DataSourceService,
        @inject('ThemeService') private themeService: ThemeService,
        @inject('AppStore') private appStore: AppStore
    ) {}
    
    /**
     * 处理快速输入
     * @param input 用户输入的原始文本
     * @returns 创建的数据源
     */
    async processInput(input: string): Promise<DataSource> {
        const parsed = this.parseInput(input);
        const dataSource = await this.createDataSource(parsed);
        this.saveToHistory(input);
        return dataSource;
    }
    
    /**
     * 批量处理输入
     * @param inputs 多行输入文本
     * @returns 创建的数据源数组
     */
    async processBatchInput(inputs: string[]): Promise<DataSource[]> {
        return Promise.all(inputs.map(input => this.processInput(input)));
    }
    
    /**
     * 获取自动补全建议
     * @param prefix 输入前缀
     * @param type 建议类型（theme/tag）
     * @returns 建议列表
     */
    getSuggestions(prefix: string, type: 'theme' | 'tag'): string[] {
        // 实现逻辑
    }
}
```

### InputParser

解析用户输入的文本，提取内容、主题和标签。

```typescript
export class InputParser {
    private readonly THEME_PREFIX = '#';
    private readonly TAG_PREFIX = '@';
    
    /**
     * 解析输入文本
     * @param input 原始输入
     * @returns 解析结果
     */
    parse(input: string): ParsedInput {
        const content = this.extractContent(input);
        const theme = this.extractTheme(input);
        const tags = this.extractTags(input);
        const metadata = this.extractMetadata(input);
        
        return {
            content,
            theme,
            tags,
            metadata,
            raw: input
        };
    }
    
    /**
     * 提取主题
     * @param input 输入文本
     * @returns 主题路径
     */
    private extractTheme(input: string): string | null {
        const match = input.match(/#([^\s@#]+)/);
        return match ? match[1] : null;
    }
    
    /**
     * 提取标签
     * @param input 输入文本
     * @returns 标签数组
     */
    private extractTags(input: string): string[] {
        const matches = input.matchAll(/@([^\s@#]+)/g);
        return Array.from(matches, m => m[1]);
    }
}
```

### React Hooks

#### useQuickInput

管理快速输入的状态和逻辑。

```typescript
export function useQuickInput() {
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [preview, setPreview] = useState<ParsedInput | null>(null);
    const [loading, setLoading] = useState(false);
    
    const service = container.resolve(QuickInputService);
    const parser = new InputParser();
    
    // 实时解析输入
    useEffect(() => {
        if (input) {
            const parsed = parser.parse(input);
            setPreview(parsed);
            updateSuggestions(input);
        }
    }, [input]);
    
    // 提交处理
    const handleSubmit = async () => {
        if (!input.trim()) return;
        
        setLoading(true);
        try {
            await service.processInput(input);
            setInput('');
            setIsOpen(false);
            showNotice('数据创建成功');
        } catch (error) {
            showError('创建失败：' + error.message);
        } finally {
            setLoading(false);
        }
    };
    
    return {
        isOpen,
        input,
        suggestions,
        preview,
        loading,
        setInput,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        submit: handleSubmit
    };
}
```

#### useAutoComplete

处理自动补全逻辑。

```typescript
export function useAutoComplete(input: string, type: 'theme' | 'tag') {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    
    const service = container.resolve(QuickInputService);
    
    useEffect(() => {
        const prefix = extractPrefix(input, type);
        if (prefix) {
            const items = service.getSuggestions(prefix, type);
            setSuggestions(items);
        } else {
            setSuggestions([]);
        }
    }, [input, type]);
    
    const selectSuggestion = (index: number) => {
        const suggestion = suggestions[index];
        if (suggestion) {
            // 应用建议到输入
            return applySuggestion(input, suggestion, type);
        }
        return input;
    };
    
    return {
        suggestions,
        selectedIndex,
        selectNext: () => setSelectedIndex(i => (i + 1) % suggestions.length),
        selectPrev: () => setSelectedIndex(i => (i - 1 + suggestions.length) % suggestions.length),
        selectCurrent: () => selectSuggestion(selectedIndex)
    };
}
```

## 🎨 UI 组件

### QuickInputModal

主模态框组件，管理整个快速输入界面。

```typescript
export const QuickInputModal: FunctionComponent = () => {
    const { isOpen, input, preview, loading, setInput, submit, close } = useQuickInput();
    
    if (!isOpen) return null;
    
    return (
        <Modal onClose={close} className="quick-input-modal">
            <div className="quick-input-header">
                <h2>快速输入</h2>
                <button onClick={close}>×</button>
            </div>
            
            <InputField
                value={input}
                onChange={setInput}
                onSubmit={submit}
                placeholder="输入内容 #主题 @标签"
                autoFocus
            />
            
            <SuggestionList
                input={input}
                onSelect={(suggestion) => setInput(suggestion)}
            />
            
            {preview && <ParsePreview data={preview} />}
            
            <div className="quick-input-footer">
                <button onClick={close}>取消</button>
                <button onClick={submit} disabled={loading || !input.trim()}>
                    {loading ? '保存中...' : '保存'}
                </button>
            </div>
        </Modal>
    );
};
```

### InputField

输入框组件，支持快捷键和实时反馈。

```typescript
interface InputFieldProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    autoFocus?: boolean;
}

export const InputField: FunctionComponent<InputFieldProps> = ({
    value,
    onChange,
    onSubmit,
    placeholder,
    autoFocus
}) => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
        
        if (e.key === 'Escape') {
            e.preventDefault();
            // 触发关闭
        }
    };
    
    return (
        <div className="input-field-wrapper">
            <textarea
                className="input-field"
                value={value}
                onChange={(e) => onChange(e.currentTarget.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                autoFocus={autoFocus}
                rows={3}
            />
            <div className="input-field-hints">
                <span>Enter 保存</span>
                <span>Shift+Enter 换行</span>
                <span>Esc 取消</span>
            </div>
        </div>
    );
};
```

## ⚙️ 配置选项

### 用户设置

```typescript
interface QuickInputSettings {
    // 快捷键设置
    hotkey: string;              // 默认: 'Ctrl+Shift+I'
    
    // 自动补全
    enableAutoComplete: boolean; // 默认: true
    maxSuggestions: number;      // 默认: 10
    
    // 历史记录
    enableHistory: boolean;      // 默认: true
    maxHistoryItems: number;     // 默认: 50
    
    // 界面
    showPreview: boolean;        // 默认: true
    modalWidth: string;          // 默认: '600px'
    modalPosition: 'center' | 'top'; // 默认: 'center'
    
    // 解析规则
    themePrefix: string;         // 默认: '#'
    tagPrefix: string;           // 默认: '@'
    
    // 批量输入
    enableBatchInput: boolean;   // 默认: false
    batchSeparator: string;      // 默认: '\n'
}
```

### 默认配置

```typescript
export const DEFAULT_QUICK_INPUT_SETTINGS: QuickInputSettings = {
    hotkey: 'Ctrl+Shift+I',
    enableAutoComplete: true,
    maxSuggestions: 10,
    enableHistory: true,
    maxHistoryItems: 50,
    showPreview: true,
    modalWidth: '600px',
    modalPosition: 'center',
    themePrefix: '#',
    tagPrefix: '@',
    enableBatchInput: false,
    batchSeparator: '\n'
};
```

## 🧪 测试

### 单元测试

```typescript
describe('InputParser', () => {
    let parser: InputParser;
    
    beforeEach(() => {
        parser = new InputParser();
    });
    
    it('应该正确解析基本输入', () => {
        const input = '完成文档 #工作 @重要';
        const result = parser.parse(input);
        
        expect(result.content).toBe('完成文档');
        expect(result.theme).toBe('工作');
        expect(result.tags).toEqual(['重要']);
    });
    
    it('应该处理多层级主题', () => {
        const input = '任务 #工作/项目A/子任务';
        const result = parser.parse(input);
        
        expect(result.theme).toBe('工作/项目A/子任务');
    });
    
    it('应该处理多个标签', () => {
        const input = '内容 @标签1 @标签2 @标签3';
        const result = parser.parse(input);
        
        expect(result.tags).toEqual(['标签1', '标签2', '标签3']);
    });
});
```

### 集成测试

```typescript
describe('QuickInputService 集成测试', () => {
    let service: QuickInputService;
    
    beforeEach(() => {
        service = container.resolve(QuickInputService);
    });
    
    it('应该创建数据源并保存历史', async () => {
        const input = '测试内容 #测试主题 @测试标签';
        const result = await service.processInput(input);
        
        expect(result).toBeDefined();
        expect(result.content).toBe('测试内容');
        
        const history = service.getHistory();
        expect(history).toContain(input);
    });
});
```

## 🚀 使用示例

### 基本使用

```typescript
// 在插件主文件中注册
export default class ThinkOSPlugin extends Plugin {
    async onload() {
        // 注册快捷键
        this.addCommand({
            id: 'open-quick-input',
            name: '打开快速输入',
            hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'i' }],
            callback: () => {
                const quickInput = container.resolve('QuickInput');
                quickInput.open();
            }
        });
    }
}
```

### 程序化调用

```typescript
// 从其他功能调用快速输入
const quickInputService = container.resolve(QuickInputService);

// 直接处理输入
const dataSource = await quickInputService.processInput('内容 #主题 @标签');

// 批量处理
const inputs = [
    '任务1 #工作 @重要',
    '任务2 #工作 @一般',
    '任务3 #个人 @学习'
];
const results = await quickInputService.processBatchInput(inputs);
```

## 📊 性能优化

### 优化策略

1. **防抖输入** - 减少解析频率
```typescript
const debouncedParse = debounce((input: string) => {
    const parsed = parser.parse(input);
    setPreview(parsed);
}, 300);
```

2. **缓存建议** - 避免重复计算
```typescript
const suggestionCache = new Map<string, string[]>();

function getCachedSuggestions(prefix: string): string[] {
    if (!suggestionCache.has(prefix)) {
        suggestionCache.set(prefix, computeSuggestions(prefix));
    }
    return suggestionCache.get(prefix)!;
}
```

3. **虚拟列表** - 处理大量建议
```typescript
// 使用虚拟滚动处理长列表
import { VirtualList } from '@shared/components';

<VirtualList
    items={suggestions}
    itemHeight={30}
    height={300}
    renderItem={(item) => <SuggestionItem data={item} />}
/>
```

4. **懒加载历史** - 按需加载
```typescript
class HistoryManager {
    private cache: string[] | null = null;
    
    async getHistory(): Promise<string[]> {
        if (!this.cache) {
            this.cache = await this.loadFromStorage();
        }
        return this.cache;
    }
}
```

### 性能指标

| 操作 | 目标时间 | 当前时间 |
|------|---------|---------|
| 打开模态框 | < 100ms | 85ms |
| 输入解析 | < 50ms | 35ms |
| 自动补全 | < 100ms | 70ms |
| 提交保存 | < 200ms | 150ms |

## 🔧 故障排除

### 常见问题

**Q1: 快捷键不生效**
- 检查快捷键是否与其他插件冲突
- 在设置中重新配置快捷键
- 重启 Obsidian

**Q2: 自动补全不显示**
- 确认设置中启用了自动补全
- 检查历史记录是否存在
- 清理缓存并重试

**Q3: 输入卡顿**
- 减少最大建议数量
- 禁用实时预览
- 检查是否有大量历史记录

**Q4: 解析错误**
- 检查输入格式是否正确
- 确认主题和标签前缀设置
- 查看控制台错误信息

## 📚 相关文档

- [仪表板功能](./dashboard.md)
- [主题系统](./theme-system.md)
- [API 参考](../../API.md#quickinputservice)
- [测试指南](../../TESTING.md)

## 🔄 版本历史

### v0.0.1 (2025-10-07)
- 初始版本发布
- 基本的快速输入功能
- 支持主题和标签解析
- 自动补全和历史记录

### 计划功能
- [ ] 模板支持
- [ ] 多语言输入
- [ ] 语音输入
- [ ] AI 智能建议
- [ ] 移动端适配

---

*文档版本：1.0.0*  
*最后更新：2025年10月7日*  
*维护者：Think OS Team*
