/**
 * Modal 模态框组件
 *
 * Top-level modal behavior is owned by OverlayRuntime: one body portal host,
 * one active stack, top-only Escape/outside-click handling and shared scroll lock.
 */

import { h, ComponentChildren } from 'preact';
import { ThinkButton } from './Button';
import { ThinkIconButton } from './IconButton';
import { getThinkDeviceProfileAttributes } from '../../utils/deviceProfile';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { acquireOverlayScrollLock, OverlayPortal, useOverlayLayer } from '../overlay/OverlayRuntime';

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
    const deviceProfileAttrs = useMemo(() => getThinkDeviceProfileAttributes(), []);
    const [isSaving, setIsSaving] = useState(false);
    const overlay = useOverlayLayer(isOpen, 'modal');
    const overlayRef = useRef<HTMLDivElement | null>(null);

    const handleClose = () => {
        if (onBeforeClose && !onBeforeClose()) return;
        onClose();
    };

    useEffect(() => {
        if (!isOpen) return;
        return acquireOverlayScrollLock();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen || !overlayRef.current) return;
        overlayRef.current.style.zIndex = String(overlay.zIndex);
    }, [isOpen, overlay.zIndex]);

    useEffect(() => {
        if (!closeOnEscape || !isOpen) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape' || !overlay.isTop) return;
            event.preventDefault();
            handleClose();
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [closeOnEscape, isOpen, overlay.isTop, onClose, onBeforeClose]);

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
            <ThinkButton variant="secondary" onClick={handleClose}>取消</ThinkButton>
            {onSave && showSaveButton && (
                <ThinkButton
                    variant="primary"
                    onClick={handleSave}
                    disabled={isSaving}
                    loading={isSaving}
                >
                    {isSaving ? '保存中...' : saveButtonText}
                </ThinkButton>
            )}
        </div>
    );

    return (
        <OverlayPortal>
            <div
                ref={overlayRef}
                className="think-os think-os--modal think-modal-overlay"
                {...deviceProfileAttrs}
                onMouseDown={(event: MouseEvent) => {
                    if (!closeOnClickOutside || !overlay.isTop) return;
                    if (event.target === event.currentTarget) handleClose();
                }}
            >
                <div className={modalClasses}>
                    {(title || showCloseButton) && (
                        <div className="think-modal__header">
                            {title && <h2 className="think-modal__title">{title}</h2>}
                            {showCloseButton && (
                                <ThinkIconButton
                                    className="think-modal__close"
                                    label="关闭"
                                    icon="×"
                                    size="sm"
                                    onClick={handleClose}
                                />
                            )}
                        </div>
                    )}

                    <div className="think-modal__body">
                        {children}
                    </div>

                    {footer !== undefined ? footer : defaultFooter}
                </div>
            </div>
        </OverlayPortal>
    );
}
