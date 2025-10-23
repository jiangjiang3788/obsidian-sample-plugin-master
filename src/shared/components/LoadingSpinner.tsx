/**
 * LoadingSpinner 加载动画组件
 */

import { h } from 'preact';

export type SpinnerSize = 'small' | 'medium' | 'large';
export type SpinnerVariant = 'dots' | 'circle' | 'pulse';

export interface LoadingSpinnerProps {
    size?: SpinnerSize;
    variant?: SpinnerVariant;
    className?: string;
    text?: string;
}

export function LoadingSpinner({
    size = 'medium',
    variant = 'dots',
    className = '',
    text
}: LoadingSpinnerProps) {
    const baseClasses = 'think-spinner';
    const sizeClass = `think-spinner--${size}`;
    const variantClass = `think-spinner--${variant}`;

    const classes = [baseClasses, sizeClass, variantClass, className]
        .filter(Boolean)
        .join(' ');

    return (
        <div className="think-spinner-container">
            {variant === 'dots' && (
                <span className={classes}>
                    <span className="think-spinner__dot"></span>
                    <span className="think-spinner__dot"></span>
                    <span className="think-spinner__dot"></span>
                </span>
            )}

            {variant === 'circle' && (
                <span className={classes}>
                    <svg className="think-spinner__circle" viewBox="0 0 50 50">
                        <circle
                            className="think-spinner__circle-path"
                            cx="25"
                            cy="25"
                            r="20"
                            fill="none"
                            strokeWidth="4"
                        />
                    </svg>
                </span>
            )}

            {variant === 'pulse' && (
                <span className={classes}>
                    <span className="think-spinner__pulse"></span>
                </span>
            )}

            {text && <span className="think-spinner__text">{text}</span>}
        </div>
    );
}
