// .eslintrc-architecture.js
// 架构依赖约束验证规则

module.exports = {
  rules: {
    '@typescript-eslint/no-restricted-imports': [
      'error',
      {
        paths: [
          // 禁止 shared 层依赖任何业务层
          {
            name: '@core/**',
            message: 'shared 层不能依赖 core 层 ❌ 违反依赖约束规范'
          },
          {
            name: '@features/**',
            message: 'shared 层不能依赖 features 层 ❌ 违反依赖约束规范'
          }
        ],
        patterns: [
          // 禁止 features 间相互依赖
          {
            group: ['@features/*/'],
            importNames: ['*'],
            message: 'Features 不能相互依赖 ❌ 违反依赖约束规范'
          },
          // 禁止 core 依赖 features
          {
            group: ['@features/**'],
            importNames: ['*'], 
            message: 'core 层不能依赖 features 层 ❌ 违反依赖约束规范'
          },
          // 禁止在文件路径中使用具体业务词汇
          {
            group: ['**/TaskService', '**/ViewService', '**/TimerService'],
            importNames: ['*'],
            message: 'core 层禁止使用具体业务词汇 ❌ 请使用抽象概念'
          }
        ]
      }
    ]
  },
  overrides: [
    // shared 目录的特殊规则
    {
      files: ['src/shared/**/*'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['@core/**', '@features/**', '../core/**', '../features/**'],
                message: 'shared 层只能依赖通用库和自身模块 ❌'
              }
            ]
          }
        ]
      }
    },
    // core 目录的特殊规则
    {
      files: ['src/core/**/*'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error', 
          {
            patterns: [
              {
                group: ['@features/**', '../features/**'],
                message: 'core 层不能依赖 features 层 ❌'
              }
            ]
          }
        ]
      }
    },
    // features 目录的特殊规则
    {
      files: ['src/features/**/*'],
      rules: {
        '@typescript-eslint/no-restricted-imports': [
          'error',
          {
            patterns: [
              // 禁止 features 间相互依赖，但允许依赖 core 和 shared
              {
                group: ['@features/!(shared)/**'],
                message: 'Features 不能相互依赖 ❌ 只能依赖 core + shared'
              }
            ]
          }
        ]
      }
    }
  ]
};
