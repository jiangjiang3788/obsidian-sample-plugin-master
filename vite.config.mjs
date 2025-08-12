// vite.config.ts —— 最简稳定版，PrismJS 用原生包手动导入
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import replace from '@rollup/plugin-replace';
import path from 'node:path'; 

export default defineConfig({
  plugins: [
    preact(),
    // 替换环境变量，避免 React 相关警告
    replace({
      'process.env.NODE_ENV': JSON.stringify('production'),
      preventAssignment: true,
    }),
  ],

  /* 让所有 react 依赖走 preact/compat，避免双框架 */
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime',
      '@core':     path.resolve(__dirname, 'src/core'),
      '@platform': path.resolve(__dirname, 'src/platform'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared':   path.resolve(__dirname, 'src/shared'),
      '@state': path.resolve(__dirname, 'src/state'),
    },
  },

  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    sourcemap: true,
    rollupOptions: {
      // Obsidian API 不打进包
      external: ['obsidian'],
      treeshake: { moduleSideEffects: false },
    },
  },

  /* dev 预打包，加速启动 */
  optimizeDeps: {
    include: ['preact', 'preact/hooks'],
  },

  /* 让 TS/JSX 自动注入 h / Fragment */
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'preact'`,
  },
});
