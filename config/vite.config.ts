// config/vite.config.ts
import { defineConfig, type Plugin } from 'vite';
import prefresh from '@prefresh/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(configDir, '..');
const srcRoot = resolve(projectRoot, 'src');
const tsconfigPath = resolve(configDir, 'tsconfig.json');
const tsconfigRaw = readFileSync(tsconfigPath, 'utf8');

/**
 * Vite refuses to treat the project root as a normal outDir because doing so can
 * overwrite source/config files. Keep Vite's own disk writer disabled and only
 * materialize the three Obsidian runtime artifacts at the repository root after
 * Rollup has finished generating the bundle.
 */
function rootObsidianArtifactsPlugin(sourcemap: boolean): Plugin {
    return {
        name: 'think-os-root-obsidian-artifacts',
        enforce: 'post',

        generateBundle(_outputOptions, bundle) {
            let mainWritten = false;
            let stylesWritten = false;

            for (const output of Object.values(bundle)) {
                if (output.type === 'chunk' && output.fileName === 'main.js') {
                    let code = output.code;
                    if (sourcemap && output.map && !code.includes('sourceMappingURL=main.js.map')) {
                        code += '\n//# sourceMappingURL=main.js.map\n';
                    }
                    writeFileSync(resolve(projectRoot, 'main.js'), code, 'utf8');
                    mainWritten = true;

                    if (sourcemap && output.map) {
                        writeFileSync(resolve(projectRoot, 'main.js.map'), JSON.stringify(output.map), 'utf8');
                    }
                    continue;
                }

                if (output.type === 'asset' && output.fileName === 'styles.css') {
                    writeFileSync(resolve(projectRoot, 'styles.css'), output.source);
                    stylesWritten = true;
                }
            }

            if (!sourcemap) {
                rmSync(resolve(projectRoot, 'main.js.map'), { force: true });
            }
            if (!mainWritten) {
                throw new Error('[vite] main.js was not generated');
            }
            if (!stylesWritten) {
                throw new Error('[vite] styles.css was not generated');
            }
        },
    };
}

export default defineConfig(({ mode }) => {
    const sourcemap = mode !== 'release';

    return {
        // Keep Vite's project root stable even though this config lives in config/.
        root: projectRoot,

        plugins: [
            prefresh(),
            // Keep tsconfig path support for tooling parity, but do not rely on it
            // for the build aliases below. `projects` paths are relative to root.
            tsconfigPaths({
                root: projectRoot,
                projects: ['config/tsconfig.json'],
            }),
            rootObsidianArtifactsPlugin(sourcemap),
        ],

        define: {
            'process.env.NODE_ENV': JSON.stringify('production'),
        },

        resolve: {
            extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
            alias: {
                // Absolute aliases make builds independent of where vite.config.ts lives.
                '@': srcRoot,
                '@app': resolve(srcRoot, 'app'),
                '@core': resolve(srcRoot, 'core'),
                '@features': resolve(srcRoot, 'features'),
                '@platform': resolve(srcRoot, 'platform'),
                '@shared': resolve(srcRoot, 'shared'),
                '@types': resolve(srcRoot, 'types'),
                '@main': resolve(srcRoot, 'main.ts'),
                '@capabilities': resolve(srcRoot, 'app/capabilities/public.ts'),

                // dayjs ESM aliases
                'dayjs/plugin/quarterOfYear': 'dayjs/esm/plugin/quarterOfYear',
                'dayjs/plugin/weekOfYear': 'dayjs/esm/plugin/weekOfYear',
                'dayjs/plugin/customParseFormat': 'dayjs/esm/plugin/customParseFormat',
                'dayjs/plugin/isoWeek': 'dayjs/esm/plugin/isoWeek',
                'dayjs/plugin/isSameOrBefore': 'dayjs/esm/plugin/isSameOrBefore',
                'dayjs': 'dayjs/esm',

                // React compatibility aliases to Preact
                'react/jsx-runtime': 'preact/jsx-runtime',
                'react-dom': 'preact/compat',
                'react': 'preact/compat',
            },
        },

        build: {
            // Do not let Vite write a dist/build/release directory. `write: false`
            // keeps the generated bundle in memory; the plugin above writes only
            // main.js, main.js.map (debug) and styles.css to projectRoot.
            write: false,
            outDir: resolve(tmpdir(), 'think-os-vite-unused-output'),
            emptyOutDir: false,
            copyPublicDir: false,
            lib: {
                entry: resolve(srcRoot, 'main.ts'),
                formats: ['cjs'],
                fileName: () => 'main.js',
            },
            sourcemap,
            minify: mode === 'release' ? 'esbuild' : false,

            rollupOptions: {
                external: ['obsidian'],

                // MUI and some React ecosystem packages ship `\"use client\"`
                // directives for React Server Components. They have no meaning in
                // an Obsidian client bundle, so suppress only those third-party
                // module-directive warnings. Also suppress broken third-party
                // sourcemap diagnostics while keeping warnings from our own code.
                onwarn(warning, warn) {
                    const warningId = 'id' in warning && typeof warning.id === 'string'
                        ? warning.id.replace(/\\/g, '/')
                        : '';
                    const message = warning.message ?? '';
                    const isThirdParty = warningId.includes('/node_modules/') ||
                        message.replace(/\\/g, '/').includes('/node_modules/');

                    if (
                        warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
                        isThirdParty &&
                        message.includes('use client')
                    ) {
                        return;
                    }

                    if (warning.code === 'SOURCEMAP_ERROR' && isThirdParty) {
                        return;
                    }

                    warn(warning);
                },

                treeshake: {
                    moduleSideEffects: (id) => {
                        return id === 'reflect-metadata' ||
                               id.includes('reflect-metadata') ||
                               id.includes('dayjs');
                    },
                },
                output: {
                    sourcemapPathTransform: (relativeSourcePath: string) => {
                        const normalized = relativeSourcePath.replace(/\\/g, '/');
                        return normalized.replace(/^\.(?:\.\/)+/, '').replace(/^\/+/, '');
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

        // Because tsconfig.json lives under config/ (not above src/), Vite's
        // esbuild transform will not discover it automatically. Feed the same
        // file to esbuild explicitly so JSX mode, jsxImportSource and legacy
        // TypeScript decorators stay identical to `tsc -p config/tsconfig.json`.
        // This avoids duplicating compiler flags in two places.
        esbuild: {
            tsconfigRaw,
        },
    };
});
