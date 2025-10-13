// vite.config.mjs
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import replace from '@rollup/plugin-replace';
import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

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
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react-dom/test-utils': 'preact/test-utils',
            'react/jsx-runtime': 'preact/jsx-runtime',
            '@core':   path.resolve(__dirname, 'src/core'),
            '@platform': path.resolve(__dirname, 'src/platform'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@shared':   path.resolve(__dirname, 'src/shared'),
            '@state':    path.resolve(__dirname, 'src/state'),
        },
    },

    build: {
        // 启用代码压缩
        minify: true,
        
        outDir: 'dist',
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: () => 'main.js',
        },
        sourcemap: true,
        rollupOptions: {
            external: (id) => id === 'obsidian',
            output: {
                intro: fs.readFileSync(require.resolve('reflect-metadata'), 'utf-8'),
            }
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
