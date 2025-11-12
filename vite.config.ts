// vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import replace from '@rollup/plugin-replace';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
    plugins: [
        preact(),
        replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            preventAssignment: true,
        }),
    ],

        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            alias: {
                '@': path.resolve(process.cwd(), 'src'),
                '@lib': path.resolve(process.cwd(), 'src/lib'),
                '@store': path.resolve(process.cwd(), 'src/store'),
                '@ui': path.resolve(process.cwd(), 'src/ui'),
                '@views': path.resolve(process.cwd(), 'src/views'),
                '@hooks': path.resolve(process.cwd(), 'src/hooks'),
                '@config': path.resolve(process.cwd(), 'src/config'),
                '@platform': path.resolve(process.cwd(), 'src/platform'),
                '@types': path.resolve(process.cwd(), 'src/types'),
                '@domain': path.resolve(process.cwd(), 'src/lib/types/domain'),
                '@utils': path.resolve(process.cwd(), 'src/utils'),
                '@services': path.resolve(process.cwd(), 'src/lib/services'),
                '@constants': path.resolve(process.cwd(), 'src/constants'),
                '@shared': path.resolve(process.cwd(), 'src/shared'),
                '@core': path.resolve(process.cwd(), 'src/core'),
                '@features': path.resolve(process.cwd(), 'src/features'),
                // React别名到Preact
                'react': 'preact/compat',
                'react-dom': 'preact/compat',
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
        sourcemap: true,
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
