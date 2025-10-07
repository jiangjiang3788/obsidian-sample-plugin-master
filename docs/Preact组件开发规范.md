# Preact 组件开发规范

> 创建日期：2025年10月7日  
> 适用项目：Think OS Obsidian 插件  
> 重要性：⚠️ **必读** - 违反这些规范会导致构建失败

## 一、关键规则 - Fragment 使用

### ❌ 错误示例：使用简写语法

```tsx
// 错误！会导致 "Fragment 已被声明" 错误
return (
    <>
        <div>内容1</div>
        <div>内容2</div>
    </>
);
```

### ✅ 正确示例：显式使用 Fragment

```tsx
// 正确！必须显式导入和使用 Fragment
import { h, Fragment } from 'preact';

return (
    <Fragment>
        <div>内容1</div>
        <div>内容2</div>
    </Fragment>
);
```

### 🔍 问题原因

在 Preact 环境中使用 `/** @jsxImportSource preact */` 时：
- `<>` 简写语法会隐式导入 Fragment
- 如果同时显式导入 Fragment，会导致重复声明错误
- 构建工具（Vite/Rollup）会报错：`Identifier "Fragment" has already been declared`

## 二、Preact 组件基础结构

### 标准模板

```tsx
// src/features/[功能]/ui/[组件名].tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';  // 必须显式导入 Fragment
import { useState, useMemo, useEffect } from 'preact/hooks';
import { useStore, AppStore } from '@state/AppStore';
// MUI 组件导入...

export function ComponentName({ appStore }: { appStore: AppStore }) {
    // 组件逻辑...
    
    return (
        <Fragment>  {/* 不要使用 <> */}
            {/* 组件内容 */}
        </Fragment>
    );
}
```

## 三、常见场景处理

### 1. 条件渲染多个元素

```tsx
// ❌ 错误
{condition && (
    <>
        <Element1 />
        <Element2 />
    </>
)}

// ✅ 正确
{condition && (
    <Fragment>
        <Element1 />
        <Element2 />
    </Fragment>
)}
```

### 2. 数组映射返回多个元素

```tsx
// ❌ 错误
items.map(item => (
    <>
        <Title>{item.title}</Title>
        <Content>{item.content}</Content>
    </>
))

// ✅ 正确
items.map(item => (
    <Fragment key={item.id}>
        <Title>{item.title}</Title>
        <Content>{item.content}</Content>
    </Fragment>
))
```

### 3. 组件返回多个根元素

```tsx
// ❌ 错误
function MyComponent() {
    return (
        <>
            <Header />
            <Main />
            <Footer />
        </>
    );
}

// ✅ 正确
function MyComponent() {
    return (
        <Fragment>
            <Header />
            <Main />
            <Footer />
        </Fragment>
    );
}
```

## 四、TypeScript 类型兼容性问题

### 常见类型错误

由于 Preact 和 React/MUI 的类型系统差异，会出现以下警告：

1. **ReactNode 类型不兼容**
   ```
   不能将类型"Element"分配给类型"ReactNode"
   ```

2. **事件处理器类型不兼容**
   ```
   类型"KeyboardEvent<HTMLDivElement>"缺少类型"KeyboardEvent"的属性
   ```

### 处理策略

这些类型警告通常不影响运行时功能，但如果需要消除：

```tsx
// 1. 类型断言（临时解决）
onContextMenu={(e) => onContextMenu(e as any, theme)}

// 2. 类型忽略（最后手段）
// @ts-ignore
<ProblematicComponent />
```

## 五、MUI 组件使用注意事项

### 1. 事件处理

```tsx
// Preact 事件类型可能与 MUI 期望的 React 事件类型不匹配
// 使用 any 类型或类型断言
onChange={(e) => setValue((e.target as any).value)}
```

### 2. Children 属性

```tsx
// MUI 组件的 children 可能需要类型断言
<Box>
    {/* @ts-ignore - Preact/React 类型不兼容 */}
    <ComplexChildren />
</Box>
```

## 六、构建和测试

### 构建前检查清单

- [ ] 所有 `<>` 都替换为 `<Fragment>`
- [ ] 正确导入 `import { h, Fragment } from 'preact'`
- [ ] 没有重复的 Fragment 声明
- [ ] 处理了关键的类型错误

### 构建命令

```bash
# 开发构建（会显示所有警告）
npm run dev

# 生产构建（必须通过）
npm run build

# 类型检查（可能有警告但不应有错误）
npm run type-check
```

## 七、调试技巧

### 如果遇到 Fragment 错误

1. **搜索所有 `<>` 使用**
   ```bash
   # 在 VSCode 中搜索
   <>
   </>
   ```

2. **替换为 Fragment**
   - 查找：`<>`
   - 替换：`<Fragment>`
   - 查找：`</>`
   - 替换：`</Fragment>`

3. **确保导入正确**
   ```tsx
   import { h, Fragment } from 'preact';
   ```

## 八、项目特定规则

### ThemeMatrix 组件示例

```tsx
// src/features/settings/ui/ThemeMatrix.tsx
/** @jsxImportSource preact */
import { h, Fragment } from 'preact';
// ... 其他导入

function ThemeTreeNodeRow({ ... }) {
    return (
        <Fragment>  {/* 必须使用 Fragment，不能用 <> */}
            <TableRow>
                {/* 内容 */}
            </TableRow>
            {expanded && children.map(child => (
                <ThemeTreeNodeRow key={child.theme.id} ... />
            ))}
        </Fragment>
    );
}
```

## 九、常见错误及解决方案

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| `Identifier "Fragment" has already been declared` | 使用了 `<>` 简写 | 替换为 `<Fragment>` |
| `不能将类型"Element"分配给类型"ReactNode"` | Preact/React 类型不兼容 | 添加类型断言或忽略 |
| `Build failed: Fragment` | Fragment 相关构建错误 | 检查所有 Fragment 使用 |

## 十、最佳实践总结

1. **永远不要使用 `<>` 简写语法**
2. **始终显式导入 Fragment**
3. **接受一些类型警告是正常的**（Preact + MUI 的固有问题）
4. **专注于消除构建错误，而不是所有类型警告**
5. **在必要时使用类型断言**

## 十一、迁移检查清单

当将 React 组件迁移到 Preact 时：

- [ ] 添加 `/** @jsxImportSource preact */`
- [ ] 导入改为 `from 'preact'` 和 `from 'preact/hooks'`
- [ ] 所有 `<>` 改为 `<Fragment>`
- [ ] 处理事件类型不兼容
- [ ] 测试构建是否通过

---

> ⚠️ **重要提醒**：这个规范是基于实际项目经验总结的。Fragment 简写问题是 Preact 开发中最容易犯的错误，会直接导致构建失败。请所有开发者严格遵守！

*文档创建：2025年10月7日*  
*作者：Cline*  
*状态：生效中*
