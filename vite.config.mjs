

import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      /** 让所有 react 依赖走 preact/compat，避免双框架冲突 */
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js',
    },
    rollupOptions: {
      /** obsidian API 走外部依赖，不打包进插件 */
      external: ['obsidian'],
    },
    sourcemap: true,
  },
  optimizeDeps: {
    /** 预打包 preact 相关依赖，提升 dev 启动速度 */
    include: ['preact', 'preact/hooks'],
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'preact'`, // 自动注入
  },
});
