# Think OS

Think OS is an Obsidian plugin built around canonical Records, configurable Views, Goal context and a spatial Whiteboard.

This root README is the project entrypoint only. **All substantive product, architecture, testing, release and historical documentation lives under `docs/`.** Start with [`docs/README.md`](docs/README.md).

## Current product contracts

- Record types have one canonical presentation order and one semantic color identity; views reuse that identity without losing their own field/layout configuration.
- Views support curated display-field configuration, including single-select options where a field schema requires a single choice.
- Record submission exposes conflict recovery actions instead of silently overwriting ambiguous or conflicting data.
- Whiteboard UI preferences such as grid visibility and Record Source collapse are presentation state, not durable board data.

## Project layout

Development-tool configuration lives under `config/`, the sanitized runtime settings example is `config/data.example.json`, and the repository root is also the Obsidian plugin output directory. `npm run build` writes `main.js`, `main.js.map` and `styles.css` directly to the root; it does not create `dist/`, `build/` or `release/` directories.

`npm run build:release` writes the minified `main.js` and `styles.css` to the root, removes any stale debug `main.js.map`, and creates `think-os-release.zip` in the root. Release packaging is implemented in Node and writes the ZIP directly, so it does not require a system `zip` command and leaves no staging directory in the project.

If you are applying the cumulative patch over an older checkout, run this once after extracting it:

```bash
npm run cleanup:layout
```

It removes the old root-level tool configs plus legacy `examples/`, `dist/`, `build/`, `release/` and `.venv/` paths. It intentionally does **not** delete `data.json`, so local Obsidian settings are preserved.

## Verification and release

Use the documented verification matrix in `docs/TESTING_RELEASE.md`. The release build entrypoint is:

```bash
npm run build:release
```
