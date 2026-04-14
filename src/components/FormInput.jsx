import React from 'react';

export default function FormInput({
  label, type = 'text', value, onChange, placeholder,
  disabled, options, className = '', size = '', ...rest
}) {
  const inputClass = `form-input ${size === 'lg' ? 'form-input--lg' : ''} ${className}`;

  const renderInput = () => {
    if (type === 'select') {
      return (
        <select className={inputClass} value={value} onChange={onChange} disabled={disabled} {...rest}>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'textarea') {
      return (
        <textarea
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
      {label && <label className="form-label">{label}</label>}
      {renderInput()}
    </div>
  );
}
