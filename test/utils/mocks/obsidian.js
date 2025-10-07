// Mock for obsidian module
module.exports = {
  Notice: jest.fn(),
  TFile: jest.fn(),
  TFolder: jest.fn(),
  Vault: jest.fn(),
  App: jest.fn(),
  Plugin: jest.fn(),
  PluginSettingTab: jest.fn(),
  Modal: jest.fn(),
  Setting: jest.fn(),
  Component: jest.fn(),
  MarkdownView: jest.fn(),
  WorkspaceLeaf: jest.fn()
};
