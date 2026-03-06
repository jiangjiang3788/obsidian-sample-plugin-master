
import React from "react";

export interface SelectablePillProps {
  selected?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}

export function SelectablePill({
  selected = false,
  onClick,
  children,
  className,
  disabled = false,
  title,
}: SelectablePillProps) {

  const classes = [
    "qi-selectable-pill",
    selected ? "is-selected" : "",
    className || ""
  ].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={selected}
      className={classes}
      style={{
        appearance: "none",
        border: selected
          ? "none"
          : "1px solid var(--background-modifier-border)",
        background: selected
          ? "var(--interactive-accent)"
          : "var(--background-primary)",
        color: selected
          ? "var(--text-on-accent, white)"
          : "var(--text-normal)",
        borderRadius: "10px",
        fontWeight: selected ? 600 : 500,
        padding: "6px 14px",
        cursor: disabled ? "default" : "pointer",
        lineHeight: 1.2,
        boxShadow: selected
          ? "0 1px 6px rgba(0,0,0,0.18)"
          : "none",
        transition:
          "background-color 120ms ease, color 120ms ease, border 120ms ease, box-shadow 120ms ease",
        opacity: disabled ? 0.6 : 1
      }}
    >
      {children}
    </button>
  );
}

export default SelectablePill;
