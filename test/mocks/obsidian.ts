// Minimal Obsidian API mock for unit/integration tests
export class Notice {
  message: string;
  timeout?: number;
  constructor(message: string, timeout?: number) {
    this.message = message;
    this.timeout = timeout;
  }
}

export class App {
  workspace = new Workspace();
  vault = new Vault();
}

export class Workspace {
  getActiveViewOfType() { return null; }
  getLeavesOfType() { return []; }
  on() { return { id: 'mock' }; }
  off() {}
  trigger() {}
}

export class Vault {
  getFiles() { return []; }
  getMarkdownFiles() { return []; }
  read() { return Promise.resolve(''); }
  modify() { return Promise.resolve(); }
  create() { return Promise.resolve(); }
  delete() { return Promise.resolve(); }
  adapter = {
    exists: () => Promise.resolve(false),
    read: () => Promise.resolve(''),
    write: () => Promise.resolve(),
  };
}

export class Plugin {
  app: App;
  manifest: any;
  constructor(app?: App, manifest?: any) {
    this.app = app || new App();
    this.manifest = manifest || {};
  }
  addCommand() {}
  addSettingTab() {}
  registerView() {}
  registerExtensions() {}
  registerEvent() {}
  loadData() { return Promise.resolve(null); }
  saveData() { return Promise.resolve(); }
}

export class MarkdownView {
  editor = null;
  getViewType() { return 'markdown'; }
}

export class Editor {
  getValue() { return ''; }
  setValue() {}
  replaceRange() {}
}

export class TFile {
  path: string;
  basename: string;
  extension: string;
  constructor(path: string = '') {
    this.path = path;
    this.basename = path.split('/').pop()?.split('.')[0] || '';
    this.extension = path.split('.').pop() || '';
  }
}

export class TFolder {
  path: string;
  children: any[] = [];
  constructor(path: string = '') {
    this.path = path;
  }
}

export class Modal {
  app: App;
  constructor(app?: App) {
    this.app = app || new App();
  }
  open() {}
  close() {}
  onOpen() {}
  onClose() {}
}

export class Setting {
  setName() { return this; }
  setDesc() { return this; }
  addText() { return this; }
  addToggle() { return this; }
  addDropdown() { return this; }
  addButton() { return this; }
  addTextArea() { return this; }
  addSlider() { return this; }
}

export class ItemView {
  getViewType() { return ''; }
  getDisplayText() { return ''; }
  getIcon() { return ''; }
}

export class WorkspaceLeaf {}

export class PluginSettingTab {
  app: App;
  plugin: Plugin;
  constructor(app?: App, plugin?: Plugin) {
    this.app = app || new App();
    this.plugin = plugin || new Plugin();
  }
  display() {}
  hide() {}
}

export class Component {
  registerEvent() {}
  register() {}
  load() {}
  unload() {}
}

export const debounce = (fn: Function, _wait?: number) => fn;
export const normalizePath = (path: string) => path;
export const requestUrl = () => Promise.resolve({ text: '', json: {} });
export const setIcon = () => {};
export const addIcon = () => {};
export const Platform = { isDesktop: true, isMobile: false, isDesktopApp: true };
export const MarkdownRenderer = {
  renderMarkdown: () => Promise.resolve(),
  render: () => Promise.resolve(),
};
