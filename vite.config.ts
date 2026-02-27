// vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import replace from '@rollup/plugin-replace';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
    plugins: [
        preact(),
        tsconfigPaths(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            preventAssignment: true,
        }),
    ],

        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            alias: {
                // 解析保持与 tsconfig paths 一致
                // （@/ @core/ @app/ ... 由 vite-tsconfig-paths 提供）
                // dayjs ESM 别名
                'dayjs': 'dayjs/esm',
                'dayjs/plugin/quarterOfYear': 'dayjs/esm/plugin/quarterOfYear',
                'dayjs/plugin/weekOfYear': 'dayjs/esm/plugin/weekOfYear',
                'dayjs/plugin/customParseFormat': 'dayjs/esm/plugin/customParseFormat',
                'dayjs/plugin/isoWeek': 'dayjs/esm/plugin/isoWeek',
                'dayjs/plugin/isSameOrBefore': 'dayjs/esm/plugin/isSameOrBefore',
                // React 别名到 Preact
                'react': 'preact/compat',
                'react-dom': 'preact/compat',
                'react/jsx-runtime': 'preact/jsx-runtime',
            },
        },

    build: {
        outDir: 'dist',
        emptyOutDir: true,
        copyPublicDir: false,
        lib: {
            entry: 'src/main.ts',
            formats: ['cjs'],
            fileName: () => 'main.js',
        },
        sourcemap: true,
        minify: false, // 更易于 DevTools sourcemap 映射与调试

        rollupOptions: {
            external: ['obsidian'],
            treeshake: { 
                moduleSideEffects: (id) => {
                    // 保留 reflect-metadata 和 dayjs 的副作用
                    return id === 'reflect-metadata' || 
                           id.includes('reflect-metadata') ||
                           id.includes('dayjs');
                }
            },
            // 确保 reflect-metadata 优先加载
            output: {
                sourcemapPathTransform: (relativeSourcePath: string) => {
                    // 让 DevTools 更容易显示为 src/** 的路径（避免 ../.. 或绝对路径）
                    const p = relativeSourcePath.replace(/\\/g, '/');
                    return p.replace(/^\.(?:\.\/)+/, '').replace(/^\/+/, '');
                },

                assetFileNames: 'styles.css',
                manualChunks: undefined,
                // 强制 reflect-metadata 在最前面
                inlineDynamicImports: true,
                // 确保 reflect-metadata 不被优化掉
                globals: {
                    'reflect-metadata': 'Reflect'
                },
                // 强制包含 reflect-metadata
                exports: 'named'
            },
        },
        // 确保 reflect-metadata 被包含
        commonjsOptions: {
            include: [/reflect-metadata/, /hoist-non-react-statics/, /prop-types/, /react-is/]
        }
    },

    optimizeDeps: {
        include: ['preact', 'preact/hooks', 'reflect-metadata', 'tsyringe'],
    },

    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: `import { h } from 'preact'`,
    },
});
