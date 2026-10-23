// src/platform/obsidian/modals/modalPreact.ts
import { h, type ComponentChildren } from 'preact';
import type { Modal } from 'obsidian';
import { render, unmountComponentAtNode } from 'preact/compat';
import { ThinkMuiThemeProvider } from '@shared/ui/public';
import { applyThinkDeviceProfileAttributes } from '@shared/utils/public';
import { getThinkSurface, recordThinkDiagnostic } from '../ThinkDiagnostics';

export function prepareThinkModal(modal: Modal, ...classes: string[]): HTMLElement {
  modal.contentEl.empty();
  for (const className of ['think-os', 'think-os--modal', 'think-modal-host', ...classes]) {
    modal.modalEl.addClass(className);
  }
  applyThinkDeviceProfileAttributes(modal.modalEl);
  const surface = getThinkSurface(modal.modalEl);
  // Quick input already traces its own opening duration.
  if (surface && surface !== 'quickinput') recordThinkDiagnostic('modal.open', undefined, undefined, surface);
  return modal.contentEl;
}

/** All Obsidian modal close events share the same plugin-owned surface classification. */
export function recordThinkModalClose(modal: Modal): void {
  recordThinkDiagnostic('modal.close', undefined, undefined, getThinkSurface(modal.modalEl) || 'think-ui');
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
