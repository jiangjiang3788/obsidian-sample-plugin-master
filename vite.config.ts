// vite.config.ts
import { defineConfig } from 'vite';
import prefresh from '@prefresh/vite';
import tsconfigPaths from 'vite-tsconfig-paths';

/**
 * Think OS is an Obsidian plugin built in Vite library mode, not an HTML/SSR app.
 * Keep the build toolchain intentionally small:
 * - Vite handles TS/TSX transpilation.
 * - @prefresh/vite provides Preact HMR support for development.
 * - React compatibility aliases are declared explicitly below.
 *
 * Do not reintroduce @preact/preset-vite here unless the plugin actually gains
 * an HTML prerender/SSR use case. The preset imports vite-prerender-plugin as part
 * of its application preset dependency graph, which is unnecessary for this
 * library build and makes config loading depend on prerender-only packages.
 */
export default defineConfig(({ mode }) => ({
    plugins: [
        prefresh(),
        tsconfigPaths(),
    ],

    // Library mode does not replace process.env.* by default. Keep the previous
    // production constant semantics using Vite's native define support instead
    // of @rollup/plugin-replace.
    define: {
        'process.env.NODE_ENV': JSON.stringify('production'),
    },

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
            // React 别名到 Preact（不依赖 application preset）
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
        sourcemap: mode !== 'release',
        minify: mode === 'release' ? 'esbuild' : false,

        rollupOptions: {
            external: ['obsidian'],
            treeshake: {
                moduleSideEffects: (id) => {
                    // 保留 reflect-metadata 和 dayjs 的副作用
                    return id === 'reflect-metadata' ||
                           id.includes('reflect-metadata') ||
                           id.includes('dayjs');
                },
            },
            output: {
                sourcemapPathTransform: (relativeSourcePath: string) => {
                    const p = relativeSourcePath.replace(/\\/g, '/');
                    return p.replace(/^\.(?:\.\/)+/, '').replace(/^\/+/, '');
                },
                assetFileNames: 'styles.css',
                manualChunks: undefined,
                inlineDynamicImports: true,
                globals: {
                    'reflect-metadata': 'Reflect',
                },
                exports: 'named',
            },
        },
        commonjsOptions: {
            include: [/reflect-metadata/, /hoist-non-react-statics/, /prop-types/, /react-is/],
        },
    },

    optimizeDeps: {
        include: ['preact', 'preact/hooks', 'reflect-metadata', 'tsyringe'],
    },

    // Preserve the existing classic Preact JSX transform. The project already
    // uses this convention and many TSX files explicitly import `h`.
    esbuild: {
        jsxFactory: 'h',
        jsxFragment: 'Fragment',
        jsxInject: `import { h } from 'preact'`,
    },
}));
