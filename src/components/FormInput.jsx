import React, { useId } from 'react';
import { noAutofill } from '../utils/noAutofill';

export default function FormInput({
  label, type = 'text', value, onChange, placeholder,
  disabled, options, className = '', size = '', autofill = false, ...rest
}) {
  // Password fields (and anything passing autofill) keep password-manager support.
  const guard = autofill || type === 'password' ? {} : noAutofill(`wealth-${String(label || placeholder || 'field').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`);
  const inputClass = `form-input ${size === 'lg' ? 'form-input--lg' : ''} ${className}`;
  const inputId = useId();

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select id={inputId} className={inputClass} value={value} onChange={onChange} disabled={disabled} {...rest}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
          {...guard}
          id={inputId}
          className={inputClass}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          {...rest}
        />
      );
    }

    return (
      <input
        {...guard}
        id={inputId}
        type={type}
        className={inputClass}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        {...rest}
      />
    );
  };

  return (
    <div className="form-group">
      {label && <label className="form-label" htmlFor={inputId}>{label}</label>}
      {renderInput()}
    </div>
  );
}
