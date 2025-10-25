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
            
            // 新的扁平化路径别名
            '@lib':      path.resolve(__dirname, 'src/lib'),
            '@store':    path.resolve(__dirname, 'src/store'),
            '@ui':       path.resolve(__dirname, 'src/ui'),
            '@views':    path.resolve(__dirname, 'src/views'),
            '@hooks':    path.resolve(__dirname, 'src/hooks'),
            '@config':   path.resolve(__dirname, 'src/config'),
            '@platform': path.resolve(__dirname, 'src/platform'),
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
