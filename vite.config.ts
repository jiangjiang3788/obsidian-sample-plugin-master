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
        jsxInject: `import { h } from 'preact'`,
    },
});
