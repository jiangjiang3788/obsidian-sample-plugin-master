// .eslintrc-architecture.js
// 架构依赖约束验证规则（被 .eslintrc.cjs 引用）
//
// 设计原则：
// - 统一使用 eslint core rule：no-restricted-imports
// - 禁止 shared 依赖 core/features
// - 禁止 core 依赖 features
// - 禁止 features 互相依赖（允许依赖 core + shared）
// - 禁止 features import slices / legacy store / AppStore
//
// 注意：no-restricted-imports 的 patterns 只能用 group（glob），paths 只能匹配具体模块名。
// 所以这里统一使用 patterns + group 来实现 glob 约束。

module.exports = {
  rules: {
    // 默认规则（对所有文件生效的兜底约束）
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          // 禁止 core 依赖 features（全局兜底，防止漏掉 overrides）
          {
            group: ["@features/**", "../features/**"],
            message: "core 层不能依赖 features 层 ❌ 违反依赖约束规范",
          },

          // 禁止 shared 依赖 core/features（全局兜底，最终以 shared override 为准）
          {
            group: ["@core/**", "../core/**"],
            message: "shared 层不能依赖 core 层 ❌ 违反依赖约束规范",
          },
          {
            group: ["@features/**", "../features/**"],
            message: "shared 层不能依赖 features 层 ❌ 违反依赖约束规范",
          },
        ],
      },
    ],
  },

  overrides: [
    // shared 目录的特殊规则：只能依赖通用库 + shared 自身模块
    {
      files: ["src/shared/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@core/**", "../core/**", "@/core/**"],
                message: "shared 层只能依赖通用库和自身模块 ❌（禁止依赖 core）",
              },
              {
                group: ["@features/**", "../features/**", "@/features/**"],
                message: "shared 层只能依赖通用库和自身模块 ❌（禁止依赖 features）",
              },
              {
                group: ["@app/**", "../app/**", "@/app/**"],
                message: "shared 层不能依赖 app 层 ❌",
              },
            ],
          },
        ],
      },
    },

    // core 目录的特殊规则：禁止依赖 features（允许依赖 shared）
    {
      files: ["src/core/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["@features/**", "../features/**", "@/features/**"],
                message: "core 层不能依赖 features 层 ❌",
              },

              // 可选：如果你希望 core 也不能依赖 app（很多架构都要求）
              {
                group: ["@/app/**", "../app/**", "src/app/**"],
                message: "core 层不能依赖 app 层 ❌（请通过接口/注入）",
              },

              // 你原本的“业务词汇”约束其实属于命名规范，不建议用 import 规则做。
              // 但你坚持要保留的话，我这里按“禁止 import 这些命名路径”保留为弱约束。
              // 你如果想更严格，应该用 eslint-plugin-unicorn/filename-case 或自定义规则。
              {
                group: ["**/TaskService", "**/ViewService", "**/TimerService"],
                message: "core 层禁止使用具体业务词汇 ❌ 请使用抽象概念（建议改名/抽象）",
              },
            ],
          },
        ],
      },
    },

    // features 目录的特殊规则：禁止 features 互相依赖，但允许依赖 core + shared
    {
      files: ["src/features/**/*.{ts,tsx,js,jsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              // 禁止 features 间相互依赖（这里用多种路径写法兜底）
              {
                group: [
                  "@features/**",
                  "@/features/**",
                  "../features/**",
                  "../../features/**",
                  "../../../features/**",
                ],
                message: "Features 不能相互依赖 ❌ 只能依赖 core + shared",
              },

              // 【SSOT】禁止新增或使用旧 Class Store / legacy
              {
                group: ["src/legacy/**", "**/AppStore", "@/app/AppStore", "@/app/AppStoreContext"],
                message: "SSOT：禁止新增或使用旧 Class Store / AppStore。",
              },

              // 【S5 规范】禁止 features 层直接 import slices
              {
                group: [
                  "@/app/store/slices/*",
                  "@/app/store/slices/**",
                  "src/app/store/slices/*",
                  "src/app/store/slices/**",
                  "../app/store/slices/*",
                  "../../app/store/slices/*",
                  "../../../app/store/slices/*",
                ],
                message:
                  "[S5] features 层禁止直接 import slices ❌ 请使用 useCases.layout（或对应 useCases），详见 src/app/ARCH_CONSTRAINTS.md",
              },

              // 【S5 规范】禁止 features 层直接 import viewInstance.usecase（必须走 useCases.layout）
              {
                group: [
                  "@/app/usecases/viewInstance.usecase",
                  "src/app/usecases/viewInstance.usecase",
                  "../app/usecases/viewInstance.usecase",
                  "../../app/usecases/viewInstance.usecase",
                ],
                message:
                  "[S5] features 层禁止直接 import viewInstance.usecase ❌ 请使用 useCases.layout，详见 src/app/ARCH_CONSTRAINTS.md",
              },

              // 【S5 规范】禁止 features 层直接 import group.usecase（功能禁用）
              {
                group: [
                  "@/app/usecases/group.usecase",
                  "src/app/usecases/group.usecase",
                  "../app/usecases/group.usecase",
                  "../../app/usecases/group.usecase",
                ],
                message:
                  "[S5] features 层禁止直接 import group.usecase ❌ Group 功能已禁用，详见 src/app/ARCH_CONSTRAINTS.md",
              },

              // 你原有的规则：features 不能直接使用 IO（repositories/adapters）
              {
                group: ["src/core/repositories/**", "src/core/adapters/**", "@/core/repositories/**", "@/core/adapters/**"],
                message: "features 不能直接使用 IO，请通过 UseCase。",
              },

              // 你原有的规则：UI 禁止直接调用 store actions（如果你 store actions 在某文件里）
              // 这里保留，按你原配置的路径
              {
                group: ["src/app/store/store", "@/app/store/store"],
                message: "UI 禁止直接调用 store actions，请通过 UseCase。",
              },
            ],
          },
        ],
      },
    },
  ],
};
