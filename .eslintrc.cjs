// .eslintrc.cjs
// ESLint Root Config（唯一入口）
// - 架构依赖约束来自 .eslintrc-architecture.js
// - console 策略：关键路径 error，其它 src/** warn，脚本/配置不误伤

const architecture = require('./.eslintrc-architecture.js');

module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],

  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],

  rules: {
    // 默认不限制 console：把约束收口在 src/**，避免 scripts/config 被误伤。
    'no-console': 'off',
    ...(architecture.rules || {}),
  },

  overrides: [
    ...(architecture.overrides || []),

    // ✅ 基线：src 内默认 warn（冻结扩散）
    {
      files: ['src/**/*.{ts,tsx,js,jsx}'],
      rules: {
        'no-console': 'warn',
      },
    },

    // ✅ 关键路径：严格禁止 console（必须保持 0 console）
    {
      files: [
        'src/main.ts',
        'src/app/usecases/**/*.{ts,tsx}',
        'src/app/store/slices/**/*.{ts,tsx}',
        'src/core/ai/**/*.{ts,tsx}',
      ],
      rules: {
        'no-console': 'error',
      },
    },

    // ✅ 白名单：允许 devLogger/performance 内部使用 console（封装层）
    {
      files: ['src/core/utils/devLogger.ts', 'src/shared/utils/performance.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
