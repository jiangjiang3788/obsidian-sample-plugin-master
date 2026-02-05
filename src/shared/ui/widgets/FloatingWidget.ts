// src/shared/ui/widgets/FloatingWidget.ts
import { h } from 'preact';
import type { ComponentChildren } from 'preact';
import { createServices, mountWithServices, unmountPreact, type Services } from '@/app/public';

/**
 * 通用 FloatingWidget：在 document.body 上创建容器并渲染传入的 Preact 子树
 * 使用示例：new FloatingWidget(id, () => h(MyComponent, props)).load();
 */
export class FloatingWidget {
    id: string;
    private containerEl: HTMLElement | null = null;
    private renderFn: () => ComponentChildren;
    private services: Services | null = null;

    constructor(id: string, renderFn: () => ComponentChildren) {
        this.id = id;
        this.renderFn = renderFn;
    }

    load() {
        if (this.containerEl) return;
        this.containerEl = document.createElement('div');
        this.containerEl.id = `think-floating-widget-${this.id}`;
        document.body.appendChild(this.containerEl);
        console.log('[FloatingWidget] load()', this.id);
        this.render();
    }

    unload() {
        if (!this.containerEl) return;
        unmountPreact(this.containerEl);
        console.log('[FloatingWidget] unload()', this.id);
        this.containerEl.remove();
        this.containerEl = null;
    }

    private render() {
        if (!this.containerEl) return;
        // wrap with ServicesProvider so hooks/useCases inside work
        // Phase 4.3: shared 层禁止 import tsyringe container
        // - Services 只能通过 app/public 的 createServices() 获取
        if (!this.services) {
            this.services = createServices();
        }
        console.log('[FloatingWidget] render()', this.id);
        mountWithServices(this.containerEl, this.renderFn(), this.services);
    }
}

export default FloatingWidget;
