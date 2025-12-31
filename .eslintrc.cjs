module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  overrides: [
    {
      files: ["src/features/**/*.{ts,tsx}", "src/core/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["src/legacy/**", "**/AppStore"],
                message: "SSOT：禁止新增或使用旧 Class Store。",
              },
            ],
          },
        ],
      },
    },
    {
      files: ["src/features/**/*.{ts,tsx}"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                group: ["src/app/store/store"],
                message: "UI 禁止直接调用 store actions，请通过 UseCase。",
              },
              {
                group: ["src/core/repositories/**", "src/core/adapters/**"],
                message: "features 不能直接使用 IO，请通过 UseCase。",
              },
            ],
          },
        ],
      },
    },
  ],
  rules: {},
};
