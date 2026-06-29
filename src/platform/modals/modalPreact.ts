// src/platform/modals/modalPreact.ts
import { h, type ComponentChildren } from 'preact';
import type { Modal } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { ThinkMuiThemeProvider } from '@shared/public';


export function prepareThinkModal(modal: Modal, ...classes: string[]): HTMLElement {
  modal.contentEl.empty();
  for (const className of ['think-os', 'think-os--modal', 'think-modal-host', ...classes]) {
    modal.modalEl.addClass(className);
  }
  return modal.contentEl;
}

/**
 * Small local wrapper for Preact content mounted inside Obsidian Modal contentEl.
 * Keeps direct compat render/unmount calls out of individual modal classes and
 * guarantees that every modal consumes the Think OS MUI bridge.
 */
export function renderModalContent(containerEl: HTMLElement, children: ComponentChildren): void {
  render(h(ThinkMuiThemeProvider, null, children), containerEl);
}

export function unmountModalContent(containerEl: HTMLElement): void {
  try {
    unmountComponentAtNode(containerEl);
  } catch (error) {
    // Obsidian can tear down modal DOM during plugin unload; unmount must be best-effort.
  }
}
