// Small building blocks shared across pages.

import { CircleAlert, CircleCheck } from 'lucide-react';

const BUTTON_VARIANTS = {
  primary:
    'bg-teal-700 text-white shadow-sm shadow-teal-900/20 hover:bg-teal-800 focus-visible:outline-teal-700',
  secondary:
    'bg-white text-slate-700 shadow-xs ring-1 ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-teal-700',
  danger:
    'bg-white text-red-700 shadow-xs ring-1 ring-red-200 hover:bg-red-50 focus-visible:outline-red-700',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-teal-700',
  light: 'bg-white text-teal-800 shadow-sm hover:bg-teal-50 focus-visible:outline-white',
  outline: 'text-white ring-1 ring-white/60 hover:bg-white/10 focus-visible:outline-white',
};

/** Button styles, also usable on links: <Link className={buttonClass()}>. */
export function buttonClass(variant = 'primary') {
  return `inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 ${BUTTON_VARIANTS[variant]}`;
}

export function Button({ variant, className = '', ...props }) {
  return <button className={`${buttonClass(variant)} ${className}`} {...props} />;
}

/** Text box styles, shared by inputs, textareas, and selects. */
export const inputClass =
  'block w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-xs transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/15 focus:outline-none';

/** Checkbox and radio styles. */
export const checkClass = 'h-4 w-4 shrink-0 rounded accent-teal-700';

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
        className={`mt-1.5 ${inputClass}`}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}

/** An icon on a soft teal square. Decorative, so screen readers skip it. */
export function IconTile({ icon: Icon, size = 'md', className = '' }) {
  const styles =
    size === 'lg'
      ? 'h-12 w-12 rounded-2xl bg-linear-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-900/20'
      : 'h-10 w-10 rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-600/10';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center ${styles} ${className}`}
    >
      <Icon className={size === 'lg' ? 'h-6 w-6' : 'h-5 w-5'} />
    </span>
  );
}

/** A page's title, with an icon, a sentence or two about the page, and optional buttons. */
export function PageHeader({ icon, title, children, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex items-start gap-4">
        <IconTile icon={icon} size="lg" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
          {children && <p className="mt-1 max-w-2xl text-slate-600">{children}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A white panel, for grouping part of a page. */
export function Card({ as: Tag = 'section', padded = true, className = '', ...props }) {
  return (
    <Tag
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/[0.03] ${padded ? 'p-6' : ''} ${className}`}
      {...props}
    />
  );
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700',
  teal: 'bg-teal-50 text-teal-800 ring-1 ring-teal-600/20',
  emerald: 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-900 ring-1 ring-amber-600/20',
  solid: 'bg-teal-700 text-white',
};

/** A small pill label. */
export function Badge({ tone = 'slate', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:h-3.5 [&_svg]:w-3.5 ${BADGE_TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** A grey placeholder shape that pulses while content loads. */
export function Skeleton({ className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`rounded-xl bg-slate-200/70 motion-safe:animate-shimmer ${className}`}
    />
  );
}

/** Placeholder cards while a page loads. `label` is read out to screen readers. */
export function LoadingCards({ count = 3, label = 'Loading…', className = 'h-32' }) {
  return (
    <div role="status" className="space-y-4">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function Alert({ kind = 'error', children }) {
  const error = kind === 'error';
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-sm ring-1 ${
        error
          ? 'bg-red-50 text-red-800 ring-red-200'
          : 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      }`}
    >
      <Icon aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
