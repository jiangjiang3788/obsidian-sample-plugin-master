/**
 * Button 通用按钮组件
 */

import { h, ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
export type ButtonSize = 'small' | 'medium' | 'large';

export interface ButtonProps {
    children: ComponentChildren;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    onClick?: (e: MouseEvent) => void | Promise<void>;
    type?: 'button' | 'submit' | 'reset';
    className?: string;
    icon?: ComponentChildren;
    iconPosition?: 'left' | 'right';
}

export function Button({
    children,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    fullWidth = false,
    onClick,
    type = 'button',
    className = '',
    icon,
    iconPosition = 'left'
}: ButtonProps) {
    const [isProcessing, setIsProcessing] = useState(false);

    const handleClick = async (e: MouseEvent) => {
        if (disabled || loading || isProcessing || !onClick) return;

        try {
            setIsProcessing(true);
            await onClick(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const baseClasses = 'think-button';
    const variantClass = `think-button--${variant}`;
    const sizeClass = `think-button--${size}`;
    const fullWidthClass = fullWidth ? 'think-button--full-width' : '';
    const disabledClass = (disabled || loading || isProcessing) ? 'think-button--disabled' : '';
    const loadingClass = (loading || isProcessing) ? 'think-button--loading' : '';

    const classes = [
        baseClasses,
        variantClass,
        sizeClass,
        fullWidthClass,
        disabledClass,
        loadingClass,
        className
    ].filter(Boolean).join(' ');

    const showIcon = icon && !loading && !isProcessing;
    const showSpinner = loading || isProcessing;

    return (
        <button
            type={type}
            className={classes}
            onClick={handleClick as any}
            disabled={disabled || loading || isProcessing}
        >
            {showSpinner && (
                <span className="think-button__spinner">
                    <LoadingSpinner size="small" />
                </span>
            )}
            
            {showIcon && iconPosition === 'left' && (
                <span className="think-button__icon think-button__icon--left">
                    {icon}
                </span>
            )}
            
            <span className="think-button__content">{children}</span>
            
            {showIcon && iconPosition === 'right' && (
                <span className="think-button__icon think-button__icon--right">
                    {icon}
                </span>
            )}
        </button>
    );
}

// LoadingSpinner 组件的简单实现（稍后会创建独立文件）
function LoadingSpinner({ size = 'medium' }: { size?: 'small' | 'medium' | 'large' }) {
    return (
        <span className={`think-spinner think-spinner--${size}`}>
            <span className="think-spinner__dot"></span>
            <span className="think-spinner__dot"></span>
            <span className="think-spinner__dot"></span>
        </span>
    );
}
