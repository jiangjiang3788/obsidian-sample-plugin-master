// src/app/ui/mountWithServices.tsx
/**
 * mountWithServices
 *
 * 目的：
 * - 统一“render + ServicesProvider 包装 + unmount”的重复样板
 * - 让 features/shared 的 Modal / SettingTab / Widget 只关注 UI 本身
 *
 * 注意：
 * - 这里是 UI 启动层的小工具，不是新的组合根
 * - Services 的唯一真源仍然是 createServices()
 */

/** @jsxImportSource preact */
import { h, type ComponentChildren } from 'preact';
import { render, unmountComponentAtNode } from 'preact/compat';

import { ServicesProvider } from '../AppStoreContext';
import { createServices } from '../createServices';
import type { Services } from '../services.types';

export interface MountWithServicesResult {
  services: Services;
  unmount: () => void;
}

/**
 * mountWithServices
 *
 * @param containerEl 目标 DOM 容器
 * @param children    需要渲染的 Preact 子树（不需要自己包 ServicesProvider）
 * @param services    可选，传入则复用；不传则内部 createServices()
 */
export function mountWithServices(
  containerEl: HTMLElement,
  children: ComponentChildren,
  services?: Services
): MountWithServicesResult {
  const finalServices = services ?? createServices();

  render(
    <ServicesProvider services={finalServices}>{children}</ServicesProvider>,
    containerEl
  );

  return {
    services: finalServices,
    unmount: () => {
      try {
        unmountComponentAtNode(containerEl);
      } catch (e) {
        // ignore
      }
    },
  };
}

/**
 * unmountPreact
 * - 统一的卸载入口，避免各处 try/catch/兼容逻辑重复
 */
export function unmountPreact(containerEl: HTMLElement) {
  try {
    unmountComponentAtNode(containerEl);
  } catch (e) {
    // ignore
  }
}
