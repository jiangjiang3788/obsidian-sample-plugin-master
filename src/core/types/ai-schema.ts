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
  /** 模型名称 */
  model: string;
  /** 温度参数 */
  temperature: number;
  /** 最大 token 数 */
  maxTokens: number;
  /** 请求超时时间（毫秒） */
  requestTimeoutMs: number;

  // block/theme 选择策略
  /** 启用的 Block ID 列表，为空表示全部参与 */
  enabledBlockIds?: string[];
  /** 默认主题 ID */
  defaultThemeId?: string;

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
  apiEndpoint: 'https://api.ricardochat.cn/v1',
  apiKey: 'sk-9BZGGwd78iHSraAdHtnLDXFoY3bJhxqRwivYazOPoA0dTepV',
  model: '[渠道2]gemini-2.5-pro',
  temperature: 0.7,
  maxTokens: 4096,
  requestTimeoutMs: 30000,
  enabledBlockIds: [],
  defaultThemeId: undefined,
  allowMultipleResults: true,
  maxResults: 5,
  confirmMode: 'single',
  preloadConfigOnStartup: false,
  configCacheTTLSeconds: 300,
  customPrompt: '',
};

/**
 * 自定义提示词模板示例
 */
export const CUSTOM_PROMPT_EXAMPLES = `【示例规则】
1. 当我说"心情"、"开心"、"难过"等情绪词时，使用"打卡"Block，字段"心情"填写情绪，"评分"填写1-5分
2. 当我说"写文章"、"写作"时，使用"任务"Block，主题选择"电脑/写作"
3. 当我说"学习了xxx"时，使用"学习记录"Block
4. 默认情况下，如果不确定，使用"闪念"Block`;

/**
 * 自然语言记录命令
 */
export interface NaturalRecordCommand {
  /** 原始输入文本 */
  rawText: string;
  /** 目标 Block 和 Theme */
  target: {
    blockId: string;
    themeId?: string;
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
