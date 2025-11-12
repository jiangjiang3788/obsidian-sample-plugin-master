/**
 * ErrorBoundary 错误边界组件
 * 捕获子组件树中的 JavaScript 错误
 */

import { h, Component, ComponentChildren } from 'preact';
import { errorHandler } from '@shared/utils/errorHandler';

export interface ErrorBoundaryProps {
    children: ComponentChildren;
    fallback?: ComponentChildren | ((error: Error) => ComponentChildren);
    onError?: (error: Error, errorInfo: any) => void;
    resetKeys?: any[];
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        // 记录错误到错误处理器
        errorHandler.handle(error, 'ErrorBoundary', {
            showNotice: false,
            logToConsole: true,
            context: errorInfo.componentStack
        });

        // 调用用户提供的错误回调
        this.props.onError?.(error, errorInfo);
    }

    componentDidUpdate(prevProps: ErrorBoundaryProps) {
        // 如果 resetKeys 改变，重置错误状态
        if (
            this.state.hasError &&
            this.props.resetKeys &&
            prevProps.resetKeys &&
            !this.areKeysEqual(prevProps.resetKeys, this.props.resetKeys)
        ) {
            this.setState({ hasError: false, error: null });
        }
    }

    private areKeysEqual(a: any[], b: any[]): boolean {
        if (a.length !== b.length) return false;
        return a.every((key, index) => key === b[index]);
    }

    private resetError = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError && this.state.error) {
            // 使用自定义 fallback
            if (this.props.fallback) {
                if (typeof this.props.fallback === 'function') {
                    return this.props.fallback(this.state.error);
                }
                return this.props.fallback;
            }

            // 默认错误 UI
            return (
                <DefaultErrorFallback
                    error={this.state.error}
                    resetError={this.resetError}
                />
            );
        }

        return this.props.children;
    }
}

/**
 * 默认错误显示组件
 */
interface DefaultErrorFallbackProps {
    error: Error;
    resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: DefaultErrorFallbackProps) {
    return (
        <div className="think-error-boundary">
            <div className="think-error-boundary__content">
                <div className="think-error-boundary__icon">⚠️</div>
                <h3 className="think-error-boundary__title">出错了</h3>
                <p className="think-error-boundary__message">
                    {error.message || '发生了一个未知错误'}
                </p>
                <details className="think-error-boundary__details">
                    <summary>错误详情</summary>
                    <pre className="think-error-boundary__stack">
                        {error.stack}
                    </pre>
                </details>
                <button
                    className="think-error-boundary__reset"
                    onClick={resetError}
                >
                    重试
                </button>
            </div>
        </div>
    );
}

/**
 * 便捷的 HOC 包装器
 */
export function withErrorBoundary<P extends object>(
    Component: (props: P) => h.JSX.Element | null,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
    return (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <Component {...props} />
        </ErrorBoundary>
    );
}
