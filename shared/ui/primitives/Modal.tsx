/**
 * Modal 模态框组件
 */

import { h, ComponentChildren } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ComponentChildren;
    footer?: ComponentChildren;
    size?: 'small' | 'medium' | 'large' | 'full';
    closeOnClickOutside?: boolean;
    closeOnEscape?: boolean;
    showCloseButton?: boolean;
    className?: string;
    onSave?: () => Promise<void> | void;
    saveButtonText?: string;
    showSaveButton?: boolean;
    onBeforeClose?: () => boolean;
}

// 修复类型问题：使用更通用的 HTMLElement 类型
function useClickOutside(ref: { current: HTMLElement | null }, handler: (event: MouseEvent) => void) {
    useEffect(() => {
        const listener = (event: MouseEvent) => {
            // 确保 event.target 是 Node 类型
            if (event.target instanceof Node && ref.current && !ref.current.contains(event.target)) {
                handler(event);
            }
        };
        document.addEventListener('mousedown', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
        };
    }, [ref, handler]);
}

export function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    size = 'medium',
    closeOnClickOutside = true,
    closeOnEscape = true,
    showCloseButton = true,
    className = '',
    onSave,
    saveButtonText = '保存',
    showSaveButton = true,
    onBeforeClose
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    // 点击外部关闭
    useClickOutside(modalRef, () => {
        if (closeOnClickOutside && isOpen) {
            handleClose();
        }
    });

    // ESC 键关闭
    useEffect(() => {
        if (!closeOnEscape || !isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, isOpen, onClose, onBeforeClose]);

    // 阻止背景滚动
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleClose = () => {
        if (onBeforeClose && !onBeforeClose()) {
            return;
        }
        onClose();
    };

    const handleSave = async () => {
        if (!onSave || isSaving) return;
        
        try {
            setIsSaving(true);
            await onSave();
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    const modalClasses = [
        'think-modal',
        `think-modal--${size}`,
        className
    ].filter(Boolean).join(' ');

    const defaultFooter = (
        <div className="think-modal__footer">
            {onSave && showSaveButton && (
                <button 
                    className="mod-cta" 
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? '保存中...' : saveButtonText}
                </button>
            )}
            <button onClick={handleClose}>取消</button>
        </div>
    );

    return (
        <div className="think-modal-overlay">
            <div className={modalClasses} ref={modalRef}>
                {(title || showCloseButton) && (
                    <div className="think-modal__header">
                        {title && <h2 className="think-modal__title">{title}</h2>}
                        {showCloseButton && (
                            <button
                                className="think-modal__close"
                                onClick={handleClose}
                                aria-label="Close modal"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}

                <div className="think-modal__body">
                    {children}
                </div>

                {footer !== undefined ? footer : defaultFooter}
            </div>
        </div>
    );
}
