// Mock for Obsidian API
class Notice {
  constructor(message, timeout) {
    this.message = message;
    this.timeout = timeout;
  }
}

class App {
  constructor() {
    this.workspace = new Workspace();
    this.vault = new Vault();
  }
}

class Workspace {
  getActiveViewOfType() {
    return null;
  }
  
  getLeavesOfType() {
    return [];
  }
}

class Vault {
  getFiles() {
    return [];
  }
  
  read() {
    return Promise.resolve('');
  }
  
  modify() {
    return Promise.resolve();
  }
}

class Plugin {
  constructor(app, manifest) {
    this.app = app;
    this.manifest = manifest;
  }
  
  addCommand() {}
  addSettingTab() {}
  registerView() {}
  registerExtensions() {}
}

class MarkdownView {
  constructor() {
    this.editor = null;
  }
}

class Editor {
  getValue() {
    return '';
  }
  
  setValue() {}
  
  replaceRange() {}
}

class TFile {
  constructor(path) {
    this.path = path;
    this.basename = path.split('/').pop().split('.')[0];
    this.extension = path.split('.').pop();
  }
}

class TFolder {
  constructor(path) {
    this.path = path;
    this.children = [];
  }
}

module.exports = {
  Notice,
  App,
  Workspace,
  Vault,
  Plugin,
  MarkdownView,
  Editor,
  TFile,
  TFolder,
  // Add more exports as needed
  Modal: class Modal {},
  Setting: class Setting {
    setName() { return this; }
    setDesc() { return this; }
    addText() { return this; }
    addToggle() { return this; }
    addDropdown() { return this; }
    addButton() { return this; }
  },
  ItemView: class ItemView {
    getViewType() { return ''; }
    getDisplayText() { return ''; }
    getIcon() { return ''; }
  },
  WorkspaceLeaf: class WorkspaceLeaf {},
  debounce: (fn, wait) => fn,
  normalizePath: (path) => path,
  requestUrl: () => Promise.resolve({ text: '', json: {} }),
};
