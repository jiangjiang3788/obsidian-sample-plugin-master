// Obsidian API Mock 对象
export class MockTFile {
  constructor(path, basename, extension) {
    this.path = path;
    this.basename = basename;
    this.extension = extension;
    this.stat = {
      mtime: new Date(),
      ctime: new Date(),
      size: 0
    };
  }
}

export class MockTFolder {
  constructor(name, parent = null) {
    this.name = name;
    this.parent = parent;
    this.children = [];
  }
}

export class MockVault {
  constructor() {
    this.files = new Map();
    this.folders = new Map();
    this.events = new Map();
  }

  // 添加文件到 vault
  addFile(path, content) {
    const file = new MockTFile(
      path,
      path.split('/').pop().replace(/\.[^/.]+$/, ''),
      path.split('.').pop()
    );
    file.content = content;
    this.files.set(path, file);
    return file;
  }

  // 获取文件内容
  async read(file) {
    return file.content || '';
  }

  // 模拟文件变更事件
  on(name, callback) {
    if (!this.events.has(name)) {
      this.events.set(name, []);
    }
    this.events.get(name).push(callback);
  }

  // 触发事件
  triggerEvent(eventName, ...args) {
    const callbacks = this.events.get(eventName) || [];
    callbacks.forEach(callback => callback(...args));
  }

  // 获取所有文件
  getFiles() {
    return Array.from(this.files.values());
  }

  // 获取文件夹
  getFolder(path) {
    return this.folders.get(path);
  }
}

export class MockWorkspace {
  constructor() {
    this.leaves = [];
    this.activeLeaf = null;
  }

  getActiveFile() {
    return this.activeLeaf?.view?.file || null;
  }

  getLeaf() {
    const leaf = {
      view: {
        file: null,
        editor: {
          getValue: () => '',
          setValue: () => {},
          getCursor: () => ({ line: 0, ch: 0 }),
          setCursor: () => {}
        }
      }
    };
    this.leaves.push(leaf);
    return leaf;
  }

  splitActiveLeaf() {
    return this.getLeaf();
  }
}

export class MockApp {
  constructor() {
    this.vault = new MockVault();
    this.workspace = new MockWorkspace();
    this.plugins = {
      plugins: new Map(),
      enablePlugin: () => {},
      disablePlugin: () => {}
    };
    this.metadataCache = {
      getFileCache: () => ({}),
      on: () => {},
      off: () => {}
    };
  }

  // 模拟 Obsidian 的 app 对象
  async vaultRead(path) {
    const file = this.vault.files.get(path);
    return file ? await this.vault.read(file) : '';
  }

  // 模拟文件保存
  async vaultModify(file, content) {
    file.content = content;
    file.stat.mtime = new Date();
  }
}

// 创建 Mock Obsidian API 的工厂函数
export const createMockObsidianAPI = () => {
  const mockApp = new MockApp();
  
  return {
    app: mockApp,
    Vault: MockVault,
    TFile: MockTFile,
    TFolder: MockTFolder,
    MarkdownView: class MockMarkdownView {
      constructor() {
        this.file = null;
        this.editor = mockApp.workspace.getLeaf().view.editor;
      }
    },
    WorkspaceLeaf: class MockWorkspaceLeaf {
      constructor() {
        this.view = null;
      }
    }
  };
};

// 全局 Mock 对象（用于测试）
export const globalMockObsidian = createMockObsidianAPI();
