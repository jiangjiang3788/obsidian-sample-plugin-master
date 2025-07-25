import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      fileName: () => 'main.js'
    },
    rollupOptions: {
      external: ['obsidian']  // ✅ obsidian 不打包进插件
    },
    sourcemap: true
  },
  optimizeDeps: {
    include: ['preact', 'preact/hooks']
  },
  esbuild: {
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    jsxInject: `import { h, Fragment } from 'preact'`  // ✅ 加上 Fragment 的自动注入
  }
});
