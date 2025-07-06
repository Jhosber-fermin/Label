// c/Respaldo Jhosber/Proyectos/Label/frontend/src/components/Common/Button.jsx
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';

const variants = {
  primary: 'bg-primary text-white hover:bg-primary-dark focus-visible:ring-primary-light',
  secondary: 'bg-surface-tertiary text-text-base hover:bg-surface-tertiary/80 focus-visible:ring-primary',
  danger: 'bg-error text-white hover:bg-red-700 focus-visible:ring-red-400',
};

const baseStyles = 'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-secondary disabled:opacity-50 disabled:cursor-not-allowed';

// Usamos forwardRef para permitir que el componente padre obtenga una referencia al <button> interno.
// Esto es útil para casos como enfocar el botón programáticamente.
const Button = forwardRef(({ children, onClick, variant = 'primary', type = 'button', disabled = false, className = '', ...rest }, ref) => {
  const variantClasses = variants[variant] || variants.primary;

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variantClasses} ${className}`}
      {...rest} // Pasamos cualquier otra prop (ej. aria-label, title) al botón.
    >
      {children}
    </button>
  );
});

// Buena práctica para debugging con forwardRef
Button.displayName = 'Button';

// Añadimos validación de props para mejorar la robustez y la experiencia de desarrollo.
Button.propTypes = {
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func,
  variant: PropTypes.oneOf(['primary', 'secondary', 'danger']),
  type: PropTypes.string,
  disabled: PropTypes.bool,
  className: PropTypes.string,
};

export default Button;
