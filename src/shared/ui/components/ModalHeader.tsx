// src/shared/ui/components/ModalHeader.tsx
/** @jsxImportSource preact */
import type { ComponentChildren } from 'preact';

import { CloseIcon } from '../icons';
import { ThinkIconButton } from '../primitives/IconButton';

export interface ModalHeaderProps {
  left: ComponentChildren;
  onClose?: () => void;
  /** 右侧自定义操作；关闭按钮始终由 onClose 单独控制。 */
  right?: ComponentChildren;
  /** 兼容旧调用：0=flush，<=1.5=compact，其余=normal。 */
  padding?: number;
  borderBottom?: boolean;
  className?: string;
}

/** Shared header contract for Obsidian-hosted modals and Think overlays. */
export function ModalHeader({
  left,
  onClose,
  right,
  padding = 1.5,
  borderBottom = true,
  className,
}: ModalHeaderProps) {
  const densityClass = padding === 0
    ? 'think-modal-header--flush'
    : padding <= 1.5
      ? 'think-modal-header--compact'
      : 'think-modal-header--normal';
  const classes = [
    'think-modal-header',
    densityClass,
    borderBottom ? '' : 'think-modal-header--borderless',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      <div className="think-modal-header__left">{left}</div>
      <div className="think-modal-header__right">
        {right}
        {onClose ? (
          <ThinkIconButton
            label="关闭"
            size="sm"
            className="think-modal-header__close"
            onClick={onClose}
            icon={<CloseIcon fontSize="small" />}
          />
        ) : null}
      </div>
    </div>
  );
}

export default ModalHeader;
