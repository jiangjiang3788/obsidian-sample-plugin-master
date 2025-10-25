/**
 * Modal 模态框组件
 */

import { h, ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { useClickOutside } from '../../hooks/shared';

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
    className = ''
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);

    // 点击外部关闭
    useClickOutside(modalRef, () => {
        if (closeOnClickOutside && isOpen) {
            onClose();
        }
    });

    // ESC 键关闭
    useEffect(() => {
        if (!closeOnEscape || !isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, isOpen, onClose]);

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

    if (!isOpen) return null;

    const modalClasses = [
        'think-modal',
        `think-modal--${size}`,
        className
    ].filter(Boolean).join(' ');

    return (
        <div className="think-modal-overlay">
            <div className={modalClasses} ref={modalRef}>
                {(title || showCloseButton) && (
                    <div className="think-modal__header">
                        {title && <h2 className="think-modal__title">{title}</h2>}
                        {showCloseButton && (
                            <button
                                className="think-modal__close"
                                onClick={onClose}
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

                {footer && (
                    <div className="think-modal__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
