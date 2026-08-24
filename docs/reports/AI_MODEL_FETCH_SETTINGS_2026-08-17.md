# AI settings model discovery system fix

## Root cause of “拉取模型” not appearing

The supplied archive is a source package. Obsidian does not execute the files under `src/` directly. The plugin manifest points to the compiled runtime file `main.js`, and the repository build script is responsible for compiling `src/main.ts` and the settings TSX tree into that file.

The supplied source archive contains neither root `main.js` / `styles.css` nor `dist/`. Therefore replacing TypeScript/TSX source files without rebuilding the plugin cannot change the UI that Obsidian is currently running. The screenshot that still shows a full-width model input with no button is consistent with an older compiled `main.js` still being loaded.

No generated bundle is hand-edited in this change.

## Source-level system change

- `AiHttpClient` now owns OpenAI-compatible `GET /models` discovery.
- Model discovery uses the same injected HTTP transport as chat requests, so Obsidian runtime requests continue to go through `ObsidianAiHttpTransport` / `requestUrl`.
- Model response parsing accepts the OpenAI `data[].id` shape plus common proxy variants (`models`, direct arrays, `name`, `model`).
- AI settings separate API-access readiness (`endpoint + key`) from full AI-call readiness (`endpoint + key + model`).
- The model row always renders a prominent “拉取模型” primary button directly to the right of the manual model input. The shared Settings stylesheet gives the input/button pair an explicit two-column layout, with a one-column fallback for narrow containers, so the action cannot disappear below an ambiguous layout.
- Successful discovery presents a select list while preserving manual model entry.
- “测试连接” now probes the model endpoint instead of making a tiny chat-completion request. This avoids false failures such as `AI returned empty content` from reasoning models whose small test token budget can produce an empty final content field.
- Changing the endpoint or key clears stale discovered models and connection status.

## Runtime build requirement

To make the UI change visible in Obsidian, rebuild the source in an environment with dependencies available:

```bash
npm ci
npm run typecheck
npm run test:unit -- --runTestsByPath test/unit/aiHttpClientModels.test.ts test/unit/aiSettingsReadiness.test.ts test/unit/platform/obsidianAiHttpTransport.test.ts
npm run build
```

The existing `npm run build` copies Vite output to root `main.js` and `styles.css`, which are the files loaded by Obsidian.

## Validation in the current environment

This environment cannot resolve the npm registry, so a fresh Vite bundle is not claimed. The change is kept at source level only, per the no-generated-bundle-patching requirement. Modified TypeScript/TSX files are syntax-transpiled locally and source wiring is checked against the repository entrypoints.
