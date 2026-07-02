import type { ComponentChildren, JSX } from 'preact';

export interface FloatingPanelProps {
    /** 唯一 id：用于 localStorage & zIndex 管理 */
    id: string;
    /** 默认位置（若 localStorage 有记录将被覆盖） */
    defaultPosition?: { x: number; y: number };

    /** 尺寸约束（透传到 Paper style） */
    minWidth?: number | string;
    maxWidth?: number | string;
    minHeight?: number | string;
    maxHeight?: number | string;
    width?: number | string;
    height?: number | string;

    /** 可调大小 */
    resizable?: boolean;

    /** 头部 */
    title?: ComponentChildren;
    headerActions?: ComponentChildren;
    showHeader?: boolean;

    /** 内容 */
    children: ComponentChildren;
    bodyPadding?: number | string;
    bodyStyle?: JSX.CSSProperties;

    /** 可见性（计时器可用：只隐藏不销毁 widget） */
    visible?: boolean;

    /** 关闭行为 */
    onClose?: () => void;
    closeOnOutsideClick?: boolean;
    closeOnEscape?: boolean;

    /** 兜底 zIndex（通常不需要传，交给 Zustand 管理） */
    zIndex?: number;

    /**
     * 是否使用 Portal 挂到 document.body。
     * 默认 true，适合普通悬浮窗。
     * 在 Obsidian 设置页内编辑输入框时，body portal 可能被设置页/Tabs 的焦点管理当作“外部区域”，
     * 导致 input focusin 后立刻 focusout 并把焦点还给 settings tab。
     * 这种场景传 false，让 fixed 面板仍然显示为悬浮窗，但 DOM 留在当前设置页焦点作用域内。
     */
    portal?: boolean;

    /** 自定义 Portal 容器；仅 portal=true 时有效。 */
    portalContainer?: Element | null;

    /**
     * 布局模式。
     * - floating: fixed 定位、可拖拽，可作为真正悬浮窗。
     * - inline: 作为设置页内部面板渲染，宽度跟随父容器，不拖拽、不使用 fixed。
     *
     * 主题模板编辑器应使用 inline，避免 body portal/fixed 面板和 Obsidian Settings/Tabs 焦点管理冲突，
     * 也避免手机端超出设置页宽高。
     */
    placement?: 'floating' | 'inline';
}
