// src/ui/common/FormControls.tsx


/** @jsxImportSource preact */
// 公共表单小组件：Field / Radio 组件

import { h } from 'preact';

export function Field({ label, children }: { label: string; children: any }) {
  return (
    <div style="margin-bottom:12px;width:100%;">
      <div style="margin-bottom:4px;font-weight:600;">{label}</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;width:100%;">{children}</div>
    </div>
  );
}

export function Radio(
  { value, checked, onChange, label, name }:
  { value: string; checked: boolean; onChange: () => void; label?: string; name?: string }
) {
  return (
    <label style="display:flex;align-items:center;gap:4px;cursor:pointer;">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        style="appearance:radio;-webkit-appearance:radio;"
      />
      <span>{label ?? value}</span>
    </label>
  );
}