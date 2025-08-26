// vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import replace from '@rollup/plugin-replace';
import path from 'node:path'; 

export default defineConfig({
    plugins: [
        preact(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            preventAssignment: true,
        }),
    ],

    resolve: {
        alias: {
            // Preact 兼容层
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react-dom/test-utils': 'preact/test-utils',
            'react/jsx-runtime': 'preact/jsx-runtime',
            
            // [修正] 补全所有 tsconfig.json 中定义的别名
            '@core':    path.resolve(__dirname, 'src/core'),
            '@platform': path.resolve(__dirname, 'src/platform'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@shared':  path.resolve(__dirname, 'src/shared'),
            '@state':   path.resolve(__dirname, 'src/state'), // <--- 增加了这一行
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
            external: ['obsidian'],
            treeshake: { moduleSideEffects: false },
        },
    },

    optimizeDeps: {
        include: ['preact', 'preact/hooks'],
    },

    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: `import { h, Fragment } from 'preact'`,
    },
});