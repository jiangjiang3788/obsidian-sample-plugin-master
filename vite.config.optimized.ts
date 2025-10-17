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
            // Preact 兼容层
            react: 'preact/compat',
            'react-dom': 'preact/compat',
            'react-dom/test-utils': 'preact/test-utils',
            'react/jsx-runtime': 'preact/jsx-runtime',
            
            // 项目别名
            '@core': path.resolve(__dirname, 'src/core'),
            '@platform': path.resolve(__dirname, 'src/platform'),
            '@features': path.resolve(__dirname, 'src/features'),
            '@shared': path.resolve(__dirname, 'src/shared'),
            '@state': path.resolve(__dirname, 'src/state'),
        },
    },

    build: {
        // 启用代码压缩和优化
        minify: 'esbuild',
        target: 'es2020',
        
        // 减少chunk大小
        chunkSizeWarningLimit: 500,
        
        outDir: 'dist',
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: () => 'main.js',
        },
        
        // 开发环境关闭sourcemap，生产环境开启
        sourcemap: process.env.NODE_ENV === 'development' ? false : true,
        
        rollupOptions: {
            external: ['obsidian'],
            
            output: {
                intro: fs.readFileSync(require.resolve('reflect-metadata'), 'utf-8'),
                
                // 手动分割代码块，减少单个文件大小
                manualChunks: (id) => {
                    if (id.includes('node_modules')) {
                        if (id.includes('preact')) return 'preact-vendor';
                        if (id.includes('@mui')) return 'mui-vendor';
                        if (id.includes('@emotion')) return 'emotion-vendor';
                        return 'vendor';
                    }
                },
            },
            
            // 启用Tree Shaking
            treeshake: {
                moduleSideEffects: false,
                propertyReadSideEffects: false,
                unknownGlobalSideEffects: false,
            },
        },
    },

    // 优化依赖预构建
    optimizeDeps: {
        include: [
            'preact',
            'preact/hooks',
            'preact/compat',
            '@emotion/react',
            '@emotion/styled',
            'dayjs',
            'immer',
            'use-immer',
        ],
        exclude: [
            'obsidian',
        ],
        // 强制预构建
        force: false,
    },

    // ESBuild优化
    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: `import { h, Fragment } from 'preact'`,
        // 移除console.log (生产环境)
        drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
        // 压缩选项
        minifyIdentifiers: true,
        minifySyntax: true,
        minifyWhitespace: true,
    },

    // 服务器配置优化
    server: {
        hmr: {
            overlay: false,
        },
        // 减少文件监听
        watch: {
            ignored: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
        },
    },

    // 缓存配置
    cacheDir: 'node_modules/.vite',
});
