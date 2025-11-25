/**
 * FormField - 表单字段组件
 * 提供统一的表单字段布局和样式
 */

import { h, ComponentChild } from 'preact';

export interface FormFieldProps {
  label: string;
  children: ComponentChild;
  required?: boolean;
  help?: string;
  error?: string;
  className?: string;
  labelWidth?: string;
}

export function FormField({
  label,
  children,
  required = false,
  help,
  error,
  className = "",
  labelWidth = "80px"
}: FormFieldProps) {
  const fieldClasses = [
    'form-field',
    error ? 'form-field--error' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={fieldClasses} style={{ marginBottom: '1rem' }}>
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '1rem' 
        }}
      >
        <label 
          className="form-label"
          style={{ 
            width: labelWidth, 
            fontWeight: 'bold',
            paddingTop: '8px',
            flexShrink: 0
          }}
        >
          {label}
          {required && <span className="required" style={{ color: 'var(--text-error)' }}>*</span>}
        </label>
        
        <div className="form-control" style={{ flex: 1 }}>
          {children}
        </div>
      </div>
      
      {help && (
        <div 
          className="form-help" 
          style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-muted)', 
            marginTop: '0.25rem',
            marginLeft: `calc(${labelWidth} + 1rem)`
          }}
        >
          {help}
        </div>
      )}
      
      {error && (
        <div 
          className="form-error" 
          style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-error)', 
            marginTop: '0.25rem',
            marginLeft: `calc(${labelWidth} + 1rem)`
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
