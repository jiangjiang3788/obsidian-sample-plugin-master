// src/core/types/ai-schema.ts
// AI 自然语言快捷输入相关类型定义

/**
 * AI 设置配置
 */
export interface AiSettings {
  /** 是否启用 AI 功能 */
  enabled: boolean;

  // OpenAI-compatible（支持 Gemini/自建转发等）
  /** API 提供商类型 */
  provider: 'openai_compat';
  /** API 端点 baseURL，例如 https://xxx/v1 */
  apiEndpoint: string;
  /** API 密钥 */
  apiKey: string;

  /** 是否将 apiKey 写入插件设置（settings.json / 插件 data）。
   *  注意：Obsidian 插件数据通常是明文存储/可同步。
   */
  persistApiKey: boolean;
  /** 模型名称 */
  model: string;
  /** 温度参数 */
  temperature: number;
  /** 最大 token 数 */
  maxTokens: number;
  /** 请求超时时间（毫秒） */
  requestTimeoutMs: number;

  // Goal × Record Type 选择策略
  /** 启用的 RecordType ID 列表，为空表示全部参与。旧 blk_* ID 会在 AI 快照中被忽略，避免空配置。 */
  enabledRecordTypeIds?: string[];
  // 多结果与确认策略
  /** 是否允许多条结果 */
  allowMultipleResults: boolean;
  /** 最大结果数量 */
  maxResults: number;
  /** 确认模式：single 单条确认，batch 批量确认 */
  confirmMode: 'single' | 'batch';

  // 性能
  /** 启动时是否预加载配置 */
  preloadConfigOnStartup: boolean;
  /** 配置缓存 TTL（秒） */
  configCacheTTLSeconds: number;

  // 个性化规则
  /** 自定义提示词/规则，用于告诉 AI 用户的个性化映射规则 */
  customPrompt?: string;
}

/**
 * AI 默认设置
 */
export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  provider: 'openai_compat',
  // 安全默认值：不预置任何第三方 endpoint / model / key，避免误请求或泄露。
  apiEndpoint: '',
  apiKey: '',
  // 默认不把密钥写入插件数据；用户明确打开后才保存。
  persistApiKey: false,
  model: '',
  temperature: 0.7,
  maxTokens: 4096,
  requestTimeoutMs: 30000,
  enabledRecordTypeIds: [],
  allowMultipleResults: false,
  maxResults: 10,
  confirmMode: 'batch',
  preloadConfigOnStartup: false,
  configCacheTTLSeconds: 300,
  customPrompt: '',
};

/**
 * 自定义提示词模板示例
 */
export const CUSTOM_PROMPT_EXAMPLES = `【示例规则】
1. 优先选择已有目标，再选择记录类型；一个目标 × Record Type 最多只有一个字段预设。
2. 当我说"心情"、"开心"、"难过"等情绪词时，优先匹配最接近的完整目标路径。
3. 当我说"写文章"、"写作"时，使用任务记录类型，并优先匹配对应目标路径。
4. 不要把目标、模板ID、周期ID写进 fieldValues；这些属于 target 或应用自动推导。
5. 计划/总结的周期由应用根据预设 periodPolicy 和日期自动生成。`;

/**
 * 自然语言记录命令
 */
export interface NaturalRecordCommand {
  /** 原始输入文本 */
  rawText: string;
  /** Goal-only target: one Goal path + one RecordType + optional unique GoalTemplate. */
  target: {
    recordTypeId: string;
    /** Canonical Goal identity, e.g. 照顾好自己/健康/睡眠. */
    goalPath?: string;
    /** Optional unique Goal x Record Type template id. There is no variant. */
    goalTemplateId?: string;
  };
  /** 字段值，key 为字段的 key */
  fieldValues: Record<string, any>;
  /** 元数据 */
  meta?: {
    /** 置信度 */
    confidence?: number;
    /** 原因说明 */
    reason?: string;
  };
}

/**
 * 自然语言记录批次
 */
export interface NaturalRecordBatch {
  items: NaturalRecordCommand[];
}
