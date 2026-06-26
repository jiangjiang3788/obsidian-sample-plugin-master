// src/platform/modals/modalPreact.ts
import type { ComponentChildren } from 'preact';
import { render, unmountComponentAtNode } from 'preact/compat';

/**
 * Small local wrapper for Preact content mounted inside Obsidian Modal contentEl.
 * Keeps direct compat render/unmount calls out of individual modal classes.
 */
export function renderModalContent(containerEl: HTMLElement, children: ComponentChildren): void {
  render(children, containerEl);
}

export function unmountModalContent(containerEl: HTMLElement): void {
  try {
    unmountComponentAtNode(containerEl);
  } catch (error) {
    // Obsidian can tear down modal DOM during plugin unload; unmount must be best-effort.
  }
}
