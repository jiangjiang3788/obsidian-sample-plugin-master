/**
 * FieldManager - 字段管理组件
 * 用于管理可选字段的添加和移除
 */

import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import { SimpleSelect } from '@shared/ui/composites/SimpleSelect';

export interface FieldManagerProps {
  fields: string[];
  availableFields: string[];
  onFieldsChange: (fields: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxFields?: number;
  className?: string;
}

export function FieldManager({
  fields,
  availableFields,
  onFieldsChange,
  placeholder = "+ 添加字段...",
  disabled = false,
  maxFields,
  className = ""
}: FieldManagerProps) {

  // 过滤可用字段（排除已选字段）
  const availableOptions = useMemo(() => {
    return availableFields
      .filter(field => !fields.includes(field))
      .map(field => ({ value: field, label: field }));
  }, [availableFields, fields]);

  const handleAddField = (field: string) => {
    if (maxFields !== undefined && fields.length >= maxFields) {
      return;
    }
    onFieldsChange([...fields, field]);
  };

  const handleRemoveField = (field: string) => {
    onFieldsChange(fields.filter(f => f !== field));
  };

  const canAddMore = !disabled && (maxFields === undefined || fields.length < maxFields);
  const hasAvailableFields = availableOptions.length > 0;

  return (
    <div className={`field-manager ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* 已选字段标签 */}
      <div className="field-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {fields.map(field => (
          <span 
            key={field} 
            className="field-tag" 
            onClick={() => !disabled && handleRemoveField(field)}
            title={`点击移除字段: ${field}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '4px 8px',
              backgroundColor: 'var(--background-modifier-form-field)',
              border: '1px solid var(--background-modifier-border)',
              borderRadius: '12px',
              fontSize: '12px',
              cursor: disabled ? 'default' : 'pointer',
              userSelect: 'none'
            }}
          >
            {field} ✕
          </span>
        ))}
      </div>
      
      {/* 字段选择器 */}
      {canAddMore && hasAvailableFields && (
        <div className="field-selector">
          <SimpleSelect 
            placeholder={placeholder}
            value=""
            options={availableOptions}
            onChange={handleAddField}
            sx={{ minWidth: '200px' }}
          />
        </div>
      )}
      
      {/* 提示信息 */}
      {!hasAvailableFields && canAddMore && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          所有可用字段已添加
        </div>
      )}
      
      {maxFields !== undefined && fields.length >= maxFields && (
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          已达到最大字段数量限制 ({maxFields})
        </div>
      )}
    </div>
  );
}
