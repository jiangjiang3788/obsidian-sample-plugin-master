// src/shared/ui/widgets/FloatingWidget.ts
import { render, h } from 'preact';
import { unmountComponentAtNode } from 'preact/compat';
import type { ComponentChildren } from 'preact';
import { ServicesProvider } from '@/app/AppStoreContext';
import { createServices } from '@/app/createServices';
import { container } from 'tsyringe';

/**
 * 通用 FloatingWidget：在 document.body 上创建容器并渲染传入的 Preact 子树
 * 使用示例：new FloatingWidget(id, () => h(MyComponent, props)).load();
 */
export class FloatingWidget {
    id: string;
    private containerEl: HTMLElement | null = null;
    private renderFn: () => ComponentChildren;

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
        try {
            unmountComponentAtNode(this.containerEl);
        } catch (e) {
            // ignore
        }
        console.log('[FloatingWidget] unload()', this.id);
        this.containerEl.remove();
        this.containerEl = null;
    }

    private render() {
        if (!this.containerEl) return;
        // wrap with ServicesProvider so hooks/useCases inside work
        const services = createServices(container);
        console.log('[FloatingWidget] render()', this.id);
        const tree = h(ServicesProvider, { services, children: this.renderFn() });
        render(tree, this.containerEl);
    }
}

export default FloatingWidget;
