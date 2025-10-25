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
            'react': 'preact/compat',
            'react-dom': 'preact/compat',
            'react-dom/test-utils': 'preact/test-utils',
            'react/jsx-runtime': 'preact/jsx-runtime',
            
            // 项目路径别名 - 从最具体到最通用的顺序
            '@lib/services/core': path.resolve(__dirname, 'src/lib/services/core'),
            '@lib/types/domain': path.resolve(__dirname, 'src/lib/types/domain'),
            '@lib/utils/shared': path.resolve(__dirname, 'src/lib/utils/shared'),
            '@lib/utils/core': path.resolve(__dirname, 'src/lib/utils/core'),
            '@lib/patterns': path.resolve(__dirname, 'src/lib/patterns'),
            '@lib/migration': path.resolve(__dirname, 'src/lib/migration'),
            '@lib': path.resolve(__dirname, 'src/lib'),
            '@store': path.resolve(__dirname, 'src/store'),
            '@ui': path.resolve(__dirname, 'src/ui'),
            '@views': path.resolve(__dirname, 'src/views'),
            '@hooks': path.resolve(__dirname, 'src/hooks'),
            '@config': path.resolve(__dirname, 'src/config'),
            '@platform': path.resolve(__dirname, 'src/platform'),
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
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
