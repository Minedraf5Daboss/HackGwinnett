import { useState } from 'react';
import { Alert, Button, Field } from './ui.jsx';

/** The email + password card shared by the login and sign-up pages. */
export default function AuthForm({ title, submitLabel, onSubmit, passwordProps, footer }) {
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
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-bold">{title}</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" required {...passwordProps} />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Please wait…' : submitLabel}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">{footer}</p>
    </div>
  );
}
