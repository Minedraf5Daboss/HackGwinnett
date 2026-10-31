// Small building blocks shared across pages.

const BUTTON_VARIANTS = {
  primary: 'bg-teal-700 text-white hover:bg-teal-800 focus-visible:outline-teal-700',
  light: 'bg-white text-teal-800 hover:bg-teal-50 focus-visible:outline-white',
  outline: 'text-white ring-1 ring-white/70 hover:bg-white/10 focus-visible:outline-white',
};

/** Button styles, also usable on links: <Link className={buttonClass()}>. */
export function buttonClass(variant = 'primary') {
  return `inline-flex items-center justify-center rounded-lg px-4 py-2 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${BUTTON_VARIANTS[variant]}`;
}

export function Button({ variant, className = '', ...props }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}

/** A labelled input. Pass `multiline` for a textarea; other props go to the input itself. */
export function Field({ label, name, hint, multiline = false, className = '', ...inputProps }) {
  const Input = multiline ? 'textarea' : 'input';
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <Input
        id={name}
        name={name}
        rows={multiline ? 3 : undefined}
        aria-describedby={hintId}
        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-xs focus:border-teal-600 focus:ring-2 focus:ring-teal-600/30 focus:outline-none"
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1 text-sm text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  const styles =
    kind === 'error'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${styles}`}
    >
      {children}
    </p>
  );
}
