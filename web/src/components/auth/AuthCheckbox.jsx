import React from 'react';

export const AuthCheckbox = ({
  checked,
  onChange,
  id,
  children,
  className = '',
}) => {
  return (
    <label className={`auth-terms-label ${className}`} htmlFor={id}>
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <div className="auth-custom-checkbox">
        <svg viewBox="0 0 12 10">
          <polyline points="1.5 6 4.5 9 10.5 1"></polyline>
        </svg>
      </div>
      <span className="auth-terms-text">{children}</span>
    </label>
  );
};
