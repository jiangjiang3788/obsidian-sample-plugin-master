/**
 * FieldManager - 字段管理组件
 * 用于管理可选字段的添加和移除
 */

import { h, ComponentChild } from 'preact';
import { useState } from 'preact/hooks';

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
  const [searchTerm, setSearchTerm] = useState('');
  
  // 过滤可用字段
  const filteredAvailableFields = availableFields
    .filter(field => 
      !fields.includes(field) && 
      field.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const handleAddField = (field: string) => {
    if (maxFields !== undefined && fields.length >= maxFields) {
      return;
    }
    onFieldsChange([...fields, field]);
    setSearchTerm('');
  };

  const handleRemoveField = (field: string) => {
    onFieldsChange(fields.filter(f => f !== field));
  };

  return (
    <div className={`field-manager ${className}`}>
      <div className="field-tags">
        {fields.map(field => (
          <span 
            key={field} 
            className="field-tag" 
            onClick={() => !disabled && handleRemoveField(field)}
            title={`点击移除字段: ${field}`}
          >
            {field} ✕
          </span>
        ))}
      </div>
      
      <div className="field-selector">
        <input
          type="text"
          className="field-search"
          placeholder={placeholder}
          value={searchTerm}
          onInput={e => setSearchTerm((e.target as HTMLInputElement).value)}
          disabled={disabled || (maxFields !== undefined && fields.length >= maxFields)}
        />
        
        {searchTerm && filteredAvailableFields.length > 0 && (
          <div className="field-suggestions">
            {filteredAvailableFields.map(field => (
              <div 
                key={field} 
                className="field-suggestion" 
                onClick={() => handleAddField(field)}
              >
                {field}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
