/** @jsxImportSource preact */
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import type { Item } from '@/core/types/schema';
import type { GroupNode } from '@core/utils/itemGrouping';

export type GroupPath = string;

export interface GroupedContainerClassNames {
    root?: string;
    group?: string;
    title?: string;
    content?: string;
    toggleIcon?: string;
    label?: string;
}

export interface GroupedContainerProps {
    nodes: GroupNode[];
    /**
     * 渲染叶子分组下的 items
     */
    renderLeaf: (items: Item[], context: { path: GroupPath; level: number; chain: { field: string; key: string }[] }) => preact.VNode | preact.VNode[];
    /**
     * 自定义 className 前缀 / 映射，支持 bv-* / et-* 两套样式
     */
    classNames?: GroupedContainerClassNames;
    /**
     * 是否启用 Ctrl+点击 全部折叠/展开
     */
    enableCtrlToggleAll?: boolean;
    /**
     * 初始是否全部折叠
     */
    defaultCollapsed?: boolean;
}

/**
 * 通用多级分组容器：
 * - 只负责分组树结构 + 折叠逻辑
 * - 具体叶子内容交给 renderLeaf 渲染
 * - 通过 classNames 适配不同视图的样式（BlockView / EventTimeline 等）
 */
export function GroupedContainer(props: GroupedContainerProps) {
    const {
        nodes,
        renderLeaf,
        classNames = {},
        enableCtrlToggleAll = true,
        defaultCollapsed = false,
    } = props;

    // 预先收集所有路径，渲染时就不会变，避免 allGroupPaths 每次 render 变化导致折叠逻辑异常
    const allGroupPaths: GroupPath[] = useMemo(() => {
        const paths: GroupPath[] = [];
        const makeGroupPath = (chain: { field: string; key: string }[]): GroupPath =>
            chain.map(n => `${n.field}=${n.key}`).join('|');
        const collectPaths = (nodes: GroupNode[], parentChain: { field: string; key: string }[] = []) => {
            for (const node of nodes) {
                const chain = [...parentChain, { field: node.field, key: node.key }];
                const path = makeGroupPath(chain);
                paths.push(path);
                if (node.children && node.children.length > 0) {
                    collectPaths(node.children, chain);
                }
            }
        };
        collectPaths(nodes);
        return paths;
    }, [nodes]);

    const [collapsedGroups, setCollapsedGroups] = useState<Record<GroupPath, boolean>>({});

    const makeGroupPath = (chain: { field: string; key: string }[]): GroupPath =>
        chain.map(n => `${n.field}=${n.key}`).join('|');

    const toggleSingleGroup = (path: GroupPath) => {
        setCollapsedGroups(prev => {
            const prevHasKey = Object.prototype.hasOwnProperty.call(prev, path);
            const current = prevHasKey ? prev[path] : defaultCollapsed;
            return {
                ...prev,
                [path]: !current,
            };
        });
    };

    const setAllGroupsCollapsed = (collapsed: boolean) => {
        setCollapsedGroups(prev => {
            const next: Record<GroupPath, boolean> = { ...prev };
            for (const path of allGroupPaths) {
                next[path] = collapsed;
            }
            return next;
        });
    };

    const onGroupTitleClick = (path: GroupPath, evt: MouseEvent) => {
        if (enableCtrlToggleAll && evt.ctrlKey) {
            const anyExpanded = allGroupPaths.some(p => {
                const has = Object.prototype.hasOwnProperty.call(collapsedGroups, p);
                const val = has ? collapsedGroups[p] : defaultCollapsed;
                return !val;
            });
            setAllGroupsCollapsed(anyExpanded);
        } else {
            toggleSingleGroup(path);
        }
    };

    const countItemsInGroup = (node: GroupNode): number => {
        const n: any = node as any;
        if (n.items) return n.items.length;
        if (!n.children) return 0;
        return (n.children as GroupNode[]).reduce(
            (sum: number, child: GroupNode) => sum + countItemsInGroup(child),
            0
        );
    };

    const {
        root: rootClass = '',
        group: groupClass = '',
        title: titleClass = '',
        content: contentClass = '',
        toggleIcon: toggleIconClass = '',
        label: labelClass = '',
    } = classNames;

    const renderGroupNodes = (
        nodes: GroupNode[],
        level: number,
        parentChain: { field: string; key: string }[] = [],
    ): preact.VNode[] => {
        return nodes.map(node => {
            const n: any = node as any;
            const items = n.items as Item[] | undefined;
            const children = (n.children as GroupNode[]) || [];
            const chain = [...parentChain, { field: node.field, key: node.key }];
            const path = makeGroupPath(chain);
            const hasKey = Object.prototype.hasOwnProperty.call(collapsedGroups, path);
            const isCollapsed = hasKey ? collapsedGroups[path] : defaultCollapsed;
            const hasChildren = children && children.length > 0;
            const isLeaf = !!items && items.length > 0;

            // 默认标题缩进策略：基础 12px + 层级 * 24px
            const indentStyle = { paddingLeft: `${12 + level * 24}px` };

            // 追加层级 class，例如：et-group et-group--level-0 / bv-group bv-group--level-1
            const levelClass = groupClass ? `${groupClass}--level-${level}` : '';

            return (
                <div class={`${groupClass} ${levelClass}`} key={path}>
                    <h5
                        class={titleClass}
                        style={indentStyle}
                        onClick={e => onGroupTitleClick(path, e as any)}
                        title="点击折叠/展开（Ctrl+点击：全部折叠/展开）"
                    >
                        <span class={toggleIconClass}>
                            {isCollapsed ? '▶' : '▼'}
                        </span>
                        <span class={labelClass}>
                            {node.key} ({isLeaf ? items!.length : countItemsInGroup(node)})
                        </span>
                    </h5>

                    {!isCollapsed && (
                        <div class={contentClass}>
                            {hasChildren && renderGroupNodes(children, level + 1, chain)}
                            {isLeaf && renderLeaf(items!, { path, level, chain })}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div class={rootClass}>
            {renderGroupNodes(nodes, 0)}
        </div>
    );
}
