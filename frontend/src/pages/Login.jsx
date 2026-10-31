import { ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import AuthForm from '../components/AuthForm.jsx';
import { Alert, Button, Field, IconTile } from '../components/ui.jsx';

export default function Login() {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [twoFactorToken, setTwoFactorToken] = useState(null); // set once the password is right

  const finish = () => navigate(location.state?.from ?? '/profile', { replace: true });

  if (twoFactorToken) {
    return (
      <CodeStep
        onSubmit={async (code) => {
          await verifyTwoFactor(twoFactorToken, code);
          finish();
        }}
        onStartOver={() => setTwoFactorToken(null)}
      />
    );
  }

  return (
    <AuthForm
      title="Log in"
      submitLabel="Log in"
      passwordProps={{ autoComplete: 'current-password' }}
      onSubmit={async (email, password) => {
        const next = await login(email, password);
        if (next) setTwoFactorToken(next.twoFactorToken);
        else finish();
      }}
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-teal-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    />
  );
}

/** The second step of logging in, for accounts with two-step verification. */
function CodeStep({ onSubmit, onStartOver }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(code);
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <IconTile icon={ShieldCheck} size="lg" />
      <h1 className="mt-4 text-2xl font-bold">Enter your code</h1>
      <p className="mt-1 text-sm text-slate-600">
        Open your authenticator app and enter the 6-digit code for MedAssist.
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <Field
          label="Code"
          name="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          minLength={6}
          maxLength={20}
          hint="Lost your phone? Enter one of your recovery codes instead."
          className="[&_input]:text-center [&_input]:font-mono [&_input]:text-xl [&_input]:tracking-[0.3em]"
        />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? 'Checking…' : 'Verify and log in'}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-600">
        <button
          type="button"
          onClick={onStartOver}
          className="font-medium text-teal-700 hover:underline"
        >
          Start over
        </button>
      </p>
    </div>
  );
}
