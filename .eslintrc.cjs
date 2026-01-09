// .eslintrc.cjs
// ESLint Root Config（唯一入口）
// 说明：所有架构依赖约束都来自 .eslintrc-architecture.js
// 这样避免出现两套规则并行、互相覆盖导致“看似有约束但实际不生效”。

const architecture = require("./.eslintrc-architecture.js");

module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],

  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],

  // ✅ 核心：把 architecture 规则注入到 root 里
  // architecture.rules / architecture.overrides 会与本文件合并
  rules: {
    ...(architecture.rules || {}),
  },

  overrides: [
    ...(architecture.overrides || []),

    // 你原来写在 .eslintrc.cjs 的 overrides（如果你还需要更多自定义规则）
    // 这里建议只放“不是架构约束”的 lint 规则，避免架构规则散落多处。

    // 示例：你可以在这里补充一般性 TS/React 规则，不涉及依赖边界。
    {
      files: ["src/**/*.{ts,tsx}"],
      rules: {
        // 例：你如果不想太严格，可以关掉某些推荐项
        // "@typescript-eslint/no-explicit-any": "warn",
      },
    },
  ],
};
