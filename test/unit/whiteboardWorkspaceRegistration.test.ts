/**
 * @covers F094/unit
 * @covers F094/regression
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('ThinkOS 白板独立工作区注册', () => {
  it('白板使用独立 Workspace Leaf + Ribbon/Command，不注册进普通 View/Layout registry', () => {
    const feature = read('src/features/whiteboard/registerFeature.ts');
    const platform = read('src/platform/obsidian/ThinkWhiteboardView.tsx');
    const viewRegistry = read('src/core/config/views/registry.ts');
    const runtimeRegistry = read('src/features/views/registry.ts');
    const editorRegistry = read('src/features/settings/views/editors/registry.tsx');

    expect(feature).toContain("id: 'whiteboard'");
    expect(feature).toContain("addRibbonIcon('panels-top-left', '思考系统白板'");
    expect(feature).toContain("id: 'think-open-whiteboard'");
    expect(platform).toContain("THINK_WHITEBOARD_VIEW_TYPE = 'think-os-whiteboard'");
    expect(platform).toContain('extends ItemView');

    for (const source of [viewRegistry, runtimeRegistry, editorRegistry]) {
      expect(source).not.toContain('AssociationView');
      expect(source).not.toContain('WhiteboardView');
    }
  });

  it('白板持久化身份不依赖 ViewInstance.id，旧 Association store 只作为测试遗留清理', () => {
    const store = read('src/core/whiteboard/WhiteboardStore.ts');
    expect(store).toContain("DEFAULT_WHITEBOARD_ID = 'whiteboard-default'");
    expect(store).toContain("DEFAULT_WHITEBOARD_STORE_PATH = 'Think/whiteboards.json'");
    expect(store).toContain("LEGACY_ASSOCIATION_STORE_PATH = 'Think/association-spaces.json'");
    expect(store).not.toContain('ViewInstance');
  });
});
