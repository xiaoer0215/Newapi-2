/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useState } from 'react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';

export const AuthTextField = ({
  autoComplete,
  className = '',
  disabled = false,
  maxLength,
  onChange,
  onKeyDown,
  placeholder,
  prefixIcon,
  prefixLabel,
  prefixWidth,
  type = 'text',
  value,
}) => {
  const hasPrefix = Boolean(prefixIcon || prefixLabel);
  const isIconOnlyPrefix = Boolean(prefixIcon && !prefixLabel);
  const controlClassName = [
    'auth-control',
    hasPrefix ? 'auth-control-with-prefix' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={controlClassName}>
      {hasPrefix ? (
        <span
          className={`auth-control-prefix ${isIconOnlyPrefix ? 'auth-control-prefix-icon-only' : ''}`}
          style={
            prefixWidth
              ? {
                  '--auth-prefix-width': `${prefixWidth}px`,
                }
              : undefined
          }
        >
          {prefixIcon ? (
            <span className='auth-control-prefix-icon' aria-hidden='true'>
              {prefixIcon}
            </span>
          ) : null}
          {prefixLabel ? (
            <span className='auth-control-prefix-text'>{prefixLabel}</span>
          ) : null}
          {prefixLabel ? (
            <span className='auth-control-prefix-divider' aria-hidden='true' />
          ) : null}
        </span>
      ) : null}
      <input
        autoComplete={autoComplete}
        className='auth-control-input'
        disabled={disabled}
        maxLength={maxLength}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={onKeyDown}
      />
    </div>
  );
};

export const AuthPasswordField = ({
  autoComplete,
  className = '',
  disabled = false,
  onChange,
  onEnterPress,
  placeholder,
  prefixIcon,
  prefixLabel,
  prefixWidth,
  value,
}) => {
  const [visible, setVisible] = useState(false);
  const hasPrefix = Boolean(prefixIcon || prefixLabel);
  const isIconOnlyPrefix = Boolean(prefixIcon && !prefixLabel);
  const controlClassName = ['auth-control', 'auth-control-password', className]
    .concat(hasPrefix ? ['auth-control-with-prefix'] : [])
    .filter(Boolean)
    .join(' ');

  return (
    <div className={controlClassName}>
      {hasPrefix ? (
        <span
          className={`auth-control-prefix ${isIconOnlyPrefix ? 'auth-control-prefix-icon-only' : ''}`}
          style={
            prefixWidth
              ? {
                  '--auth-prefix-width': `${prefixWidth}px`,
                }
              : undefined
          }
        >
          {prefixIcon ? (
            <span className='auth-control-prefix-icon' aria-hidden='true'>
              {prefixIcon}
            </span>
          ) : null}
          {prefixLabel ? (
            <span className='auth-control-prefix-text'>{prefixLabel}</span>
          ) : null}
          {prefixLabel ? (
            <span className='auth-control-prefix-divider' aria-hidden='true' />
          ) : null}
        </span>
      ) : null}
      <input
        autoComplete={autoComplete}
        className='auth-control-input'
        disabled={disabled}
        placeholder={placeholder}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onEnterPress?.(e);
          }
        }}
      />
      <button
        aria-label={visible ? 'Hide password' : 'Show password'}
        className='auth-control-toggle'
        disabled={disabled}
        type='button'
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? (
          <EyeOff size={18} strokeWidth={2.1} />
        ) : (
          <Eye size={18} strokeWidth={2.1} />
        )}
      </button>
    </div>
  );
};

export const AuthButton = ({
  children,
  className = '',
  disabled = false,
  icon,
  rightIcon,
  loading = false,
  onClick,
  type = 'button',
  variant = 'primary',
}) => {
  const buttonClassName = [
    'auth-button',
    variant === 'secondary' ? 'auth-button-secondary' : 'auth-button-primary',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClassName}
      disabled={disabled || loading}
      type={type}
      onClick={onClick}
    >
      {loading ? (
        <LoaderCircle
          className='auth-button-spinner'
          size={18}
          strokeWidth={2.2}
        />
      ) : icon ? (
        <span className='auth-button-icon'>{icon}</span>
      ) : null}
      <span className='auth-button-label'>{children}</span>
      {!loading && rightIcon ? (
        <span className='auth-button-right-icon'>{rightIcon}</span>
      ) : null}
    </button>
  );
};

export const AuthLinkButton = ({
  children,
  className = '',
  icon,
  onClick,
  type = 'button',
}) => {
  const buttonClassName = ['auth-link-button', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={buttonClassName} type={type} onClick={onClick}>
      {icon ? <span className='auth-link-button-icon'>{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
};
