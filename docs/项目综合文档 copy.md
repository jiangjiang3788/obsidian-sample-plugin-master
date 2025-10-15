# Think OS 新布局系统改造计划

## 🔍 现有架构真实分析

### ✅ 已有的真实基础

1. __ThemeManager服务__ - 完整的主题管理系统
2. __ThemeMatrix UI__ - 复杂的主题配置界面
3. __文件创建能力__ - 悬浮计时器已验证可以创建文件
4. __AppStore持久化__ - 通过 `_updateSettingsAndPersist` 保存配置
5. __完整的依赖注入__ - TSyringe架构成熟
6. __Preact + MUI__ - UI技术栈完备

### 📋 当前布局系统分析

```typescript
// 现有系统：DataSource → ViewInstance → Layout → LayoutRenderer
DataStore.items → DataSource.filters → ViewInstance.viewType → Layout.viewInstanceIds → LayoutRenderer
```

## 🎯 改造目标

__完全替换现有的Layout/ViewInstance/DataSource三层架构__，用新&#x7684;__&#x50;age系&#x7EDF;__&#x66FF;代。

## 📅 详细改造计划

### 阶段一：新Page数据结构设计（第1周）

#### 1.1 设计新的Page配置结构

__修改文件__: `src/core/domain/schema.ts`

```typescript
// 新增：完全替代Layout的Page配置
export interface PageConfig {
  id: string;
  name: string;
  
  // 布局设置（您要求的新功能）
  layout: {
    toolbarMode: 'overview' | 'navigator';     // 概览模式/导航器模式
    initialDate: string;                       // 初始日期
    followToday: boolean;                      // 跟随今日
    initialPeriod: 'day' | 'week' | 'month' | 'year'; // 初始周期
    arrangement: 'list' | 'grid' | 'tabs';     // 排列方式
    gridColumns?: number;
  };
  
  // 控制栏配置（您要求的功能）
  toolbar: {
    timeControl: {
      enabled: boolean;
      showPeriodFilter: boolean;               // 周期复选框
    };
    themeSelector: {
      enabled: boolean;
      mode: 'horizontal' | 'vertical';        // 主题横向选择器
    };
  };
  
  // 视图配置（替代ViewInstance，每个视图独立筛选）
  views: PageViewConfig[];
}

export interface PageViewConfig {
  id: string;
  title: string;
  viewType: ViewName;
  
  // 视图独立的筛选设置（您要求的核心改进）
  filters: {
    // 基础筛选（从控制栏继承的筛选）
    inheritFromToolbar: boolean;
    
    // 视图专属筛选
    itemFilters: FilterRule[];               // 条目筛选
    timeFilters: FilterRule[];               // 时间筛选  
    themeFilters: FilterRule[];              // 主题筛选
    typeFilters: FilterRule[];               // 类型筛选
  };
  
  // 排序和分组
  sorting: SortRule[];
  grouping?: {
    field: string;
    showHeaders: boolean;
    collapsible: boolean;
  };
  
  // 显示配置
  display: {
    fields: string[];
    layout: 'list' | 'grid' | 'timeline';
    styling?: ViewStylingConfig;
  };
  
  // 专属设置（针对时间轴等特殊视图）
  specificConfig?: Record<string, any>;
}
```

#### 1.2 扩展ThinkSettings支持Page系统

```typescript
export interface ThinkSettings {
  // 保留现有配置（向后兼容）
  dataSources: DataSource[];
  viewInstances: ViewInstance[];
  layouts: Layout[];
  
  // 新增：Page系统
  pages: PageConfig[];
  usePageSystem: boolean;                    // 系统切换开关
  
  // 现有其他配置保持不变
  inputSettings: InputSettings;
  floatingTimerEnabled: boolean;
  activeThemePaths?: string[];
}
```

### 阶段二：主题Block数据管理增强（第2周）

#### 2.1 增强ThemeManager处理您的Block格式

__修改文件__: `src/core/services/ThemeManager.ts`

```typescript
export class ThemeManager {
  // 新增：解析您的主题Block格式
  parseThemeBlock(content: string): ThemeBlockData | null {
    const lines = content.split('\n');
    const data: Partial<ThemeBlockData> = {};
    
    for (const line of lines) {
      if (line.includes('分类::')) data.category = line.split('::')[1]?.trim();
      if (line.includes('周期::')) data.period = line.split('::')[1]?.trim();
      if (line.includes('日期::')) data.date = line.split('::')[1]?.trim();
      if (line.includes('主题::')) data.theme = line.split('::')[1]?.trim();
      if (line.includes('图标::')) data.icon = line.split('::')[1]?.trim();
    }
    
    // 提取内容部分
    const contentStart = lines.findIndex(line => line.includes('内容::'));
    if (contentStart >= 0) {
      data.content = lines.slice(contentStart + 1).join('\n').trim();
    }
    
    return data.theme ? (data as ThemeBlockData) : null;
  }
  
  // 新增：从数据中提取主题并匹配任务
  extractAndMatchThemes(items: Item[]): { 
    extractedThemes: ThemeBlockData[]; 
    matchedItems: Item[] 
  } {
    const extractedThemes: ThemeBlockData[] = [];
    const themeMap = new Map<string, ThemeBlockData>();
    
    // 1. 提取主题Blocks
    items.forEach(item => {
      if (item.type === 'block') {
        const themeBlock = this.parseThemeBlock(item.content);
        if (themeBlock) {
          themeBlock.id = item.id;
          themeBlock.filePath = item.filename || '';
          extractedThemes.push(themeBlock);
          themeMap.set(themeBlock.theme, themeBlock);
        }
      }
    });
    
    // 2. 匹配任务到主题（根据header）
    const matchedItems = items.map(item => {
      if (item.type === 'task' && item.header && !item.theme) {
        const matchedTheme = themeMap.get(item.header);
        if (matchedTheme) {
          item.theme = matchedTheme.theme;
        }
      }
      return item;
    });
    
    return { extractedThemes, matchedItems };
  }
}

// 新增：主题Block数据结构
export interface ThemeBlockData {
  id: string;
  category: string;    // 分类:: 计划
  period: string;      // 周期:: 周  
  date: string;        // 日期:: 2025-08-04
  theme: string;       // 主题:: 生活
  icon?: string;       // 图标:: ✨
  content: string;     // 内容部分
  filePath: string;    // 来源文件
}
```

#### 2.2 增强DataStore集成主题提取

__修改文件__: `src/core/services/dataStore.ts`

```typescript
@singleton()
export class DataStore {
  // 注入ThemeManager
  constructor(
    @inject(ObsidianPlatform) private platform: ObsidianPlatform,
    @inject(AppToken) private app: App,
    @inject(ThemeManager) private themeManager: ThemeManager
  ) {}
  
  // 修改：扫描完成后自动提取和匹配主题
  async scanAll() {
    this.items = [];
    this.fileIndex.clear();
    const files = this.platform.getMarkdownFiles();
    
    for (const file of files) await this.scanFile(file);
    
    // 新增：提取主题并匹配
    const { extractedThemes, matchedItems } = this.themeManager.extractAndMatchThemes(this.items);
    this.items = matchedItems;
    
    // 保存提取的主题数据到文件（真实的持久化）
    await this.saveThemeData(extractedThemes);
    
    this.notifyChange();
  }
  
  // 新增：保存主题数据到文件
  private async saveThemeData(themes: ThemeBlockData[]): Promise<void> {
    try {
      const themeDataFile = '.obsidian/plugins/think-os/theme-data.json';
      const data = {
        themes,
        lastUpdate: Date.now(),
        version: '1.0'
      };
      await this.app.vault.adapter.write(themeDataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('保存主题数据失败:', error);
    }
  }
  
  // 新增：加载主题数据
  async loadThemeData(): Promise<ThemeBlockData[]> {
    try {
      const themeDataFile = '.obsidian/plugins/think-os/theme-data.json';
      const content = await this.app.vault.adapter.read(themeDataFile);
      const data = JSON.parse(content);
      return data.themes || [];
    } catch (error) {
      return [];
    }
  }
}
```

### 阶段三：新Page渲染器开发（第3-4周）

#### 3.1 创建PageRenderer组件

__新文件__: `src/features/pages/ui/PageRenderer.tsx`

```typescript
export function PageRenderer({ pageConfig, dataStore }: {
  pageConfig: PageConfig;
  dataStore: DataStore;
}) {
  // 控制栏状态
  const [toolbarState, setToolbarState] = useState({
    currentDate: dayjs(pageConfig.layout.followToday ? undefined : pageConfig.layout.initialDate),
    currentPeriod: pageConfig.layout.initialPeriod,
    selectedThemes: [] as string[],
    usePeriodFilter: false
  });
  
  // 获取可用主题（从ThemeManager）
  const availableThemes = useMemo(async () => {
    const themeData = await dataStore.loadThemeData();
    return themeData.map(t => ({ id: t.theme, name: t.theme, icon: t.icon }));
  }, [dataStore]);
  
  // 为每个视图计算数据
  const viewsData = useMemo(() => {
    return pageConfig.views.map(viewConfig => {
      let items = dataStore.items;
      
      // 1. 应用控制栏筛选
      if (viewConfig.filters.inheritFromToolbar) {
        // 主题筛选
        if (toolbarState.selectedThemes.length > 0) {
          items = items.filter(item => 
            toolbarState.selectedThemes.includes(item.theme || '')
          );
        }
        
        // 时间周期筛选
        if (toolbarState.usePeriodFilter) {
          items = this.filterByPeriod(items, toolbarState.currentDate, toolbarState.currentPeriod);
        }
      }
      
      // 2. 应用视图专属筛选
      viewConfig.filters.itemFilters.forEach(filter => {
        items = this.applyFilter(items, filter);
      });
      
      // 3. 应用排序
      items = this.applySorting(items, viewConfig.sorting);
      
      return { viewConfig, items };
    });
  }, [pageConfig, toolbarState, dataStore.items]);

  return (
    <div className="page-container">
      {/* 智能控制栏 */}
      <PageToolbar
        config={pageConfig.toolbar}
        layoutConfig={pageConfig.layout}
        state={toolbarState}
        availableThemes={availableThemes}
        onChange={setToolbarState}
      />
      
      {/* 视图区域 */}
      <div className={`views-container ${pageConfig.layout.arrangement}`}>
        {viewsData.map(({ viewConfig, items }) => (
          <PageViewPanel
            key={viewConfig.id}
            config={viewConfig}
            items={items}
            toolbarState={toolbarState}
          />
        ))}
      </div>
    </div>
  );
}
```

#### 3.2 创建智能控制栏组件

__新文件__: `src/features/pages/ui/PageToolbar.tsx`

```typescript
export function PageToolbar({ config, layoutConfig, state, availableThemes, onChange }: PageToolbarProps) {
  const handleTimeChange = (newDate: dayjs.Dayjs, newPeriod: string) => {
    onChange(prev => ({
      ...prev,
      currentDate: newDate,
      currentPeriod: newPeriod
    }));
  };
  
  const handleThemeChange = (themes: string[]) => {
    onChange(prev => ({ ...prev, selectedThemes: themes }));
  };

  return (
    <div className="page-toolbar">
      {/* 时间控制 */}
      {config.timeControl.enabled && (
        <div className="time-control">
          {layoutConfig.toolbarMode === 'overview' ? (
            <OverviewTimeControl
              currentDate={state.currentDate}
              currentPeriod={state.currentPeriod}
              onDateChange={handleTimeChange}
            />
          ) : (
            <NavigatorTimeControl
              currentDate={state.currentDate}
              currentPeriod={state.currentPeriod}
              onDateChange={handleTimeChange}
            />
          )}
          
          {/* 周期筛选复选框 */}
          {config.timeControl.showPeriodFilter && (
            <label className="period-filter">
              <input
                type="checkbox"
                checked={state.usePeriodFilter}
                onChange={(e) => onChange(prev => ({ 
                  ...prev, 
                  usePeriodFilter: e.target.checked 
                }))}
              />
              按{state.currentPeriod}筛选
            </label>
          )}
        </div>
      )}
      
      {/* 主题横向选择器 */}
      {config.themeSelector.enabled && (
        <HorizontalThemeSelector
          availableThemes={availableThemes}
          selectedThemes={state.selectedThemes}
          onChange={handleThemeChange}
          mode={config.themeSelector.mode}
        />
      )}
    </div>
  );
}
```

### 阶段四：AppStore集成Page系统（第4周）

#### 4.1 扩展AppStore支持Page管理

__修改文件__: `src/state/AppStore.ts`

```typescript
export class AppStore {
  // 新增：Page管理方法
  public addPage = async (name: string) => {
    await this._updateSettingsAndPersist(draft => {
      const newPage: PageConfig = {
        id: generateId('page'),
        name,
        layout: {
          toolbarMode: 'overview',
          initialDate: dayjs().format('YYYY-MM-DD'),
          followToday: true,
          initialPeriod: 'month',
          arrangement: 'list'
        },
        toolbar: {
          timeControl: { enabled: true, showPeriodFilter: false },
          themeSelector: { enabled: true, mode: 'horizontal' }
        },
        views: []
      };
      draft.pages.push(newPage);
    });
  }
  
  public updatePage = async (id: string, updates: Partial<PageConfig>) => {
    await this._updateSettingsAndPersist(draft => {
      const index = draft.pages.findIndex(p => p.id === id);
      if (index !== -1) {
        draft.pages[index] = { ...draft.pages[index], ...updates };
      }
    });
  }
  
  public deletePage = async (id: string) => {
    await this._updateSettingsAndPersist(draft => {
      draft.pages = draft.pages.filter(p => p.id !== id);
    });
  }
  
  public addViewToPage = async (pageId: string, viewConfig: PageViewConfig) => {
    await this._updateSettingsAndPersist(draft => {
      const page = draft.pages.find(p => p.id === pageId);
      if (page) {
        page.views.push(viewConfig);
      }
    });
  }
  
  // 新增：系统切换方法
  public switchToPageSystem = async (enabled: boolean) => {
    await this._updateSettingsAndPersist(draft => {
      draft.usePageSystem = enabled;
    });
  }
}
```

### 阶段五：系统集成和兼容性（第5周）

#### 5.1 修改CodeblockEmbedder支持Page系统

__修改文件__: `src/features/logic/CodeblockEmbedder.ts`

```typescript
private registerProcessor() {
  this.plugin.registerMarkdownCodeBlockProcessor(
    CODEBLOCK_LANG,
    (source, el) => {
      const settings = this.appStore.getSettings();
      
      if (settings.usePageSystem) {
        this.renderPage(el, source);
      } else {
        // 保持现有Layout系统
        this.renderLayout(el, source);
      }
    }
  );
}

private renderPage(el: HTMLElement, source: string) {
  let pageName: string;
  
  try {
    const parsed = JSON.parse(source.trim());
    pageName = parsed.page || parsed.name;
  } catch {
    pageName = source.trim().replace(/['"]/g, '');
  }
  
  const page = this.appStore.getSettings().pages.find(p => p.name === pageName);
  if (!page) {
    el.createDiv({ text: `页面 "${pageName}" 未找到` });
    return;
  }
  
  render(h(PageRenderer, {
    pageConfig: page,
    dataStore: this.dataStore
  }), el);
}
```

#### 5.2 添加系统切换设置界面

__新文件__: `src/features/settings/ui/SystemMigration.tsx`

```typescript
export function SystemMigration({ appStore }: { appStore: AppStore }) {
  const { usePageSystem, layouts, pages } = useStore(state => state.settings);
  
  const handleSwitch = async (enabled: boolean) => {
    if (enabled && layouts.length > 0) {
      // 提示用户迁移现有布局
      const migrate = confirm('是否将现有布局迁移到新Page系统？');
      if (migrate) {
        await migrateLayoutsToPages();
      }
    }
    await appStore.switchToPageSystem(enabled);
  };
  
  const migrateLayoutsToPages = async () => {
    // 实现布局到页面的迁移逻辑
    for (const layout of layouts) {
      const pageConfig = convertLayoutToPage(layout);
      await appStore.addPage(pageConfig.name);
    }
  };

  return (
    <Box>
      <Typography variant="h6">系统切换</Typography>
      <FormControlLabel
        control={
          <Switch 
            checked={usePageSystem}
            onChange={(e) => handleSwitch(e.target.checked)}
          />
        }
        label="启用新Page系统"
      />
      
      {usePageSystem ? (
        <Typography color="success.main">
          ✅ 使用新Page系统 ({pages.length}个页面)
        </Typography>
      ) : (
        <Typography color="info.main">
          📊 使用传统Layout系统 ({layouts.length}个布局)
        </Typography>
      )}
    </Box>
  );
}
```

## 📊 实施时间表

| 阶段 | 时间 | 主要任务 | 风险等级 | 

|------|------|---------|---------| 
| 第1周 | 数据结构设计 | PageConfig设计、schema修改 | 低 |
 | 第2周 | 主题数据管理 | ThemeManager增强、数据提取 | 中 |
  | 第3-4周 | Page渲染器 | PageRenderer、PageToolbar开发 | 中 | 
  | 第4周 | AppStore集成 | Page管理方法、状态管理 | 低 |
   | 第5周 | 系统集成 | 兼容性、迁移工具 | 高 |

## 🎯 预期效果

### 功能提升

- ✅ __完全替换__ Layout/ViewInstance/DataSource三层架构
- ✅ __智能控制栏__ 时间控制 + 主题横向选择
- ✅ __视图独立筛选__ 每个视图可单独配置所有筛选条件
- ✅ __主题数据自动化__ 提取、匹配、管理完全自动

### 技术优势

- ✅ __真实持久化__ 数据保存到文件，重启后保持
- ✅ __向后兼容__ 通过开关控制，现有用户无影响
