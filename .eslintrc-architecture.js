// .eslintrc-architecture.js
// 冻结阶段架构约束（被 .eslintrc.cjs 引用）
//
// 目标：
// 1) 不推倒重来：允许历史遗留存在，但必须显式列出例外（allowlist），禁止继续扩散
// 2) 唯一出口：features/shared/views 访问 app 的能力，只允许通过 src/app/public.ts
// 3) 单向依赖：core 不依赖 app/features；shared 不依赖 features；features 不依赖 app 内部实现
//
// 使用方式：
// - 这份规则是“冻结混乱”的第一道闸门：先止血，再逐步迁移（第三阶段开始收敛）
//
// 说明：
// - 这里只使用 eslint 内置 rule：no-restricted-imports（避免引入额外插件）
// - 规则不追求一口吃成胖子：先把“最危险的权力外溢”冻住

module.exports = {
  overrides: [
    // ==================================================================================
    // CORE：禁止依赖 app / features（保持核心可测试 & 可迁移）
    // ==================================================================================
    {
      files: ['src/core/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@/app/**', '@app/**', '../app/**', '../../app/**'],
                message: 'core 层不能依赖 app 层 ❌（请通过接口/注入/UseCase 组合根）',
              },
              {
                group: ['@/features/**', '@features/**', '../features/**', '../../features/**'],
                message: 'core 层不能依赖 features 层 ❌（历史例外请加入 allowlist）',
              },
              {
                group: ['@/platform/**', '@platform/**', '../platform/**', '../../platform/**'],
                message: 'core 层不能依赖 platform 层 ❌（请通过 Port 接口注入）',
              },
            ],
          },
        ],
      },
    },

    // ==================================================================================
    // APP/USECASES：禁止依赖 features（UseCases 必须保持纯应用层 Facade）
    // ==================================================================================
    {
      files: ['src/app/usecases/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  '@/features/**',
                  '@features/**',
                  // 任意深度的相对路径：../../..../features/**
                  '**/features/**',
                ],
                message:
                  'app/usecases 层禁止依赖 features ❌（UseCases 只能依赖 core/app 内部能力；UI 依赖应由上层组合根注入）',
              },
              // 2) core 只允许通过 @core/public（Phase 4.4）
              {
                group: [
                  // 禁止使用 @/core/** 绕过门面
                  '@/core/**',

                  // @core/* 只允许 @core/public，其余一律禁止
                  '@core/!(public)',
                  '@core/!(public)/**',
                ],
                message: "app/usecases 层访问 core 只能通过 '@core/public' ❌",
              },
            ],
          },
        ],
      },
    },

    // ✅ core allowlist 已清空：
    // timelineInteraction 中的 UI/feature 依赖已迁移到 features/views/timelineInteraction.ts

    
    // ==================================================================================
    // APP：core 只允许通过 @core/public（Phase 4.4）
    // ==================================================================================
    {
      files: ['src/app/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: ['src/app/usecases/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  // 禁止使用 @/core/** 绕过门面
                  '@/core/**',

                  // @core/* 只允许 @core/public，其余一律禁止
                  '@core/!(public)',
                  '@core/!(public)/**',
                ],
                message: "app 层访问 core 只能通过 '@core/public' ❌",
              },
            ],
          },
        ],
      },
    },

// ==================================================================================
    // FEATURES：只能通过 app/public 访问 app 能力（冻结“绕过边界”）
    // ==================================================================================
    {
      files: ['src/features/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            // Phase 4.3: 禁止在 features 层拿到 DI container（组合根权力必须在 app/main）
            paths: [
              {
                name: 'tsyringe',
                importNames: ['container'],
                message:
                  "features 层禁止 import { container } from 'tsyringe' ❌（组合根只能在 app/main；请通过 '@/app/public' 的 createServices()/hooks/useCases 取能力）",
              },
            ],
            patterns: [
              // 1) 禁止直接依赖 app 内部 store（只允许通过 '@/app/public' 暴露的 read-only helpers）
              {
                group: [
                  '@/app/store/**',
                  '@app/store/**',
                  // 任意深度的相对路径：../../..../app/store/**
                  '**/app/store/**',
                ],
                message:
                  "features 层禁止依赖 app/store/** ❌ 请通过 '@/app/public' 获取必要能力",
              },

              // 2) 禁止直接依赖 app/usecases 内部实现（只允许通过 public 或 DI token）
              {
                group: [
                  '@/app/usecases/**',
                  '@app/usecases/**',
                  '**/app/usecases/**',
                ],
                message:
                  "features 层禁止依赖 app/usecases/** ❌ 请通过 '@/app/public' 或注入 USECASES_TOKEN",
              },

              // 3) 禁止直接依赖 AppStoreContext / createServices（统一出口）
              {
                group: [
                  '@/app/AppStoreContext',
                  '@app/AppStoreContext',
                  '**/app/AppStoreContext',
                ],
                message:
                  "features 层禁止直接依赖 AppStoreContext ❌ 请从 '@/app/public' 引入",
              },
              {
                group: [
                  '@/app/createServices',
                  '@app/createServices',
                  '**/app/createServices',
                ],
                message:
                  "features 层禁止直接依赖 createServices ❌ 请从 '@/app/public' 引入",
              },

              // 4) 组合根禁止下沉
              {
                group: [
                  '@/app/ServiceManager',
                  '@app/ServiceManager',
                  '**/app/ServiceManager',
                ],
                message: 'features 层禁止依赖 ServiceManager（组合根）❌',
              },
              {
                group: [
                  '@/app/FeatureLoader',
                  '@app/FeatureLoader',
                  '**/app/FeatureLoader',
                ],
                message: 'features 层禁止依赖 FeatureLoader（组合根）❌',
              },

              // 5) 明确禁止 slices（写入口只能是 useCases）
              {
                group: [
                  '@/app/store/slices/**',
                  '@app/store/slices/**',
                  '**/app/store/slices/**',
                ],
                message: 'features 层禁止直接 import slices ❌（写入口必须通过 useCases）',
              },
              // 6) core 只允许通过 @core/public（Phase 4.4）
              {
                group: [
                  // 禁止使用 @/core/** 绕过门面
                  '@/core/**',

                  // @core/* 只允许 @core/public，其余一律禁止
                  '@core/!(public)',
                  '@core/!(public)/**',
                ],
                message: "features 层访问 core 只能通过 '@core/public' ❌",
              },
            ],
          },
        ],
      },
    },

    // ==================================================================================
    // SHARED：不允许依赖 features（防止 shared 成为绕过边界的通道）
    // ==================================================================================
    {
      files: ['src/shared/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            // Phase 4.3: 禁止在 shared 层拿到 DI container（否则 shared 会成为绕过边界的通道）
            paths: [
              {
                name: 'tsyringe',
                importNames: ['container'],
                message:
                  "shared 层禁止 import { container } from 'tsyringe' ❌（请通过 '@/app/public' 的 createServices()/ServicesProvider 获取能力）",
              },
              {
                name: '@core/public',
                importNames: ['ItemService'],
                message:
                  "shared 层禁止依赖 ItemService ❌（请在 feature 层桥接为 onUpdateTaskTime 等回调/DTO；shared/ui 只负责渲染与触发事件）",
              },
              {
                name: '@core/public',
                importNames: ['ActionService'],
                message:
                  "shared 层禁止依赖 ActionService ❌（请在 feature 层桥接为 onQuickCreate/onMarkDone 等回调；shared/ui 只负责渲染与触发事件）",
              },
            ],
            patterns: [
              // shared 可以依赖 core，但不应该依赖 app 内部实现
              {
                group: [
                  '@/app/store/**',
                  '@app/store/**',
                  '**/app/store/**',
                ],
                message:
                  "shared 层禁止依赖 app/store/** ❌ 如需能力请通过 '@/app/public'",
              },
              {
                group: [
                  '@/app/usecases/**',
                  '@app/usecases/**',
                  '**/app/usecases/**',
                ],
                message:
                  "shared 层禁止依赖 app/usecases/** ❌ 如需能力请通过 '@/app/public'",
              },
{
  // Phase 4.5: shared 访问 app 只能通过 app/public 或 app/capabilities
  group: [
    '@/app/!(public|capabilities)/**',
    '@app/!(public|capabilities)',
    '@app/!(public|capabilities)/**'
  ],
  message:
    "shared 层禁止深层依赖 app/** ❌ 如需能力请通过 '@/app/public' 或 '@app/capabilities'",
},

              {
                group: [
                  '@/app/AppStoreContext',
                  '@app/AppStoreContext',
                  '**/app/AppStoreContext',
                ],
                message:
                  "shared 层禁止直接依赖 AppStoreContext ❌ 请从 '@/app/public' 引入",
              },
              {
                group: [
                  '@/app/createServices',
                  '@app/createServices',
                  '**/app/createServices',
                ],
                message:
                  "shared 层禁止直接依赖 createServices ❌ 请从 '@/app/public' 引入",
              },

              // 核心冻结点：shared 不允许依赖 features
              {
                group: [
                  '@/features/**',
                  '@features/**',
                  // 任意深度的相对路径：../../..../features/**
                  '**/features/**',
                ],
                message: 'shared 层禁止依赖 features ❌（避免 shared 成为绕过边界的通道）',
              },
              // 2) core 只允许通过 @core/public（Phase 4.4）
              {
                group: [
                  // 禁止使用 @/core/** 绕过门面
                  '@/core/**',

                  // @core/* 只允许 @core/public，其余一律禁止
                  '@core/!(public)',
                  '@core/!(public)/**',
                ],
                message: "shared 层访问 core 只能通过 '@core/public' ❌",
              },
            ],
          },
        ],
      },
    },

    // ✅ shared allowlist 已清空：
    // DayColumnBody 的 features 依赖 tunnel 已迁移（见 shared/ui/modals/EditTaskModal + core/types/timeline）

    // ==================================================================================
    // SHARED/UI：纯化增量护栏（先 warn 冻结扩散）
    // - shared/ui 仍允许使用 '@/app/public'，但强烈不建议直接使用 store/services 能力
    // - 采用 warn（不阻断 CI），用于逐步收敛
    // ==================================================================================
    {
      files: ['src/shared/ui/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'warn',
          {
            paths: [
              {
                name: '@/app/public',
                importNames: ['useZustandAppStore'],
                message:
                  "shared/ui 建议不要直接使用全局 store（useZustandAppStore）⚠️ 请优先由 feature 层计算 renderModel 后注入 shared/ui",
              },
              {
                name: '@/app/public',
                importNames: ['createServices', 'mountWithServices', 'unmountPreact'],
                message:
                  "shared/ui 建议不要直接组合 services（createServices/mountWithServices）⚠️ 组合根能力应在 app/feature 层完成",
              },
            ],
          },
        ],
      },
    },

    // ==================================================================================
    // SHARED：薄出口 @shared/public；禁止上层深导入 @shared/**（避免耦合扩散）
    // ==================================================================================
    {
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      excludedFiles: ['src/shared/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: [
                  // 禁止使用 @shared/** 绕过门面（只允许 @shared/public）
                  '@shared/!(public)',
                  '@shared/!(public)/**',
                ],
                message: "请通过 '@shared/public' 引入 shared 能力（禁止 @shared/** 深导入）❌",
              },
            ],
          },
        ],
      },
    },

  ],
};
