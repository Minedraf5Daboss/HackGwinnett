import { useState } from 'react';
import AuthShell from './AuthShell.jsx';
import { Alert, Button, Field } from './ui.jsx';

/** The email + password form shared by the login and sign-up pages. */
export default function AuthForm({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  passwordProps,
  footer,
}) {
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    const { email, password } = Object.fromEntries(new FormData(event.currentTarget));
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {subtitle && <p className="mt-1 text-slate-600">{subtitle}</p>}
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" required {...passwordProps} />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Please wait…' : submitLabel}
        </Button>
      </form>
      <p className="mt-8 text-center text-sm text-slate-600">{footer}</p>
    </AuthShell>
  );
}
