import { Copy, Download, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Button, Card, Field, IconTile } from './ui.jsx';

/** Turn two-step verification (an authenticator app code at login) on or off. */
export default function TwoFactorCard() {
  const { user, refreshUser } = useAuth();
  const [setup, setSetup] = useState(null); // from POST /auth/2fa/setup, while setting up
  const [recoveryCodes, setRecoveryCodes] = useState(null); // shown once, right after turning on
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function run(action) {
    setBusy(true);
    setStatus(null);
    try {
      await action();
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setBusy(false);
    }
  }

  const enabled = user.two_factor_enabled;

  return (
    <Card>
      <div className="flex gap-4">
        <IconTile icon={enabled ? ShieldCheck : ShieldOff} />
        <div>
          <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            Two-step verification
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                enabled
                  ? 'bg-emerald-50 text-emerald-800 ring-1 ring-emerald-600/30'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {enabled ? 'On' : 'Off'}
            </span>
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            After your password, enter a code from an authenticator app on your phone, so no one
            else can get into your health information.
          </p>
        </div>
      </div>

      <div className="mt-5">
        {recoveryCodes ? (
          <RecoveryCodes codes={recoveryCodes} onDone={() => setRecoveryCodes(null)} />
        ) : enabled ? (
          <TurnOff
            busy={busy}
            onSubmit={(password, code) =>
              run(async () => {
                await api('/auth/2fa/disable', { method: 'POST', body: { password, code } });
                await refreshUser();
                setStatus({ kind: 'success', message: 'Two-step verification is off.' });
              })
            }
          />
        ) : setup ? (
          <SetupSteps
            setup={setup}
            busy={busy}
            onSubmit={(code) =>
              run(async () => {
                const result = await api('/auth/2fa/enable', { method: 'POST', body: { code } });
                setSetup(null);
                setRecoveryCodes(result.recovery_codes);
                await refreshUser();
              })
            }
            onCancel={() => setSetup(null)}
          />
        ) : (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              run(async () => setSetup(await api('/auth/2fa/setup', { method: 'POST' })))
            }
          >
            <Smartphone aria-hidden="true" className="mr-2 h-4 w-4" />
            Set up two-step verification
          </Button>
        )}
      </div>

      {status && (
        <div className="mt-4">
          <Alert kind={status.kind}>{status.message}</Alert>
        </div>
      )}
    </Card>
  );
}

function SetupSteps({ setup, busy, onSubmit, onCancel }) {
  const [code, setCode] = useState('');
  // Groups of 4 are easier to type: "ABCD EFGH ...".
  const groupedSecret = setup.secret.match(/.{1,4}/g).join(' ');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(code);
      }}
      className="grid gap-6 sm:grid-cols-[auto_1fr]"
    >
      <img
        src={setup.qr_code}
        alt="QR code to scan with your authenticator app"
        className="h-44 w-44 rounded-xl bg-white p-1 ring-1 ring-slate-200"
      />
      <div className="space-y-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
          <li>
            Open an authenticator app, such as Google Authenticator, Microsoft Authenticator, or
            1Password.
          </li>
          <li>Scan the QR code.</li>
          <li>Enter the 6-digit code the app shows.</li>
        </ol>
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-teal-700">Can't scan it?</summary>
          <p className="mt-2 text-slate-600">Enter this key in the app instead:</p>
          <p className="mt-1 font-mono text-base tracking-wider break-all select-all">
            {groupedSecret}
          </p>
        </details>
        <Field
          label="6-digit code"
          name="setup-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          pattern="\s*\d{6}\s*"
          title="The 6 digits from your app"
          className="max-w-48 [&_input]:font-mono [&_input]:text-lg [&_input]:tracking-[0.3em]"
        />
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? 'Checking…' : 'Turn on'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}

function RecoveryCodes({ codes, onDone }) {
  const [copied, setCopied] = useState(false);
  const text = `MedAssist recovery codes. Each works once.\n\n${codes.join('\n')}\n`;

  function download() {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const link = Object.assign(document.createElement('a'), {
      href: url,
      download: 'medassist-recovery-codes.txt',
    });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); // after the download starts
  }

  return (
    <div className="space-y-4">
      <Alert kind="success">Two-step verification is on.</Alert>
      <div>
        <h3 className="font-semibold">Save your recovery codes</h3>
        <p className="mt-1 text-sm text-slate-600">
          If you lose your phone, each code lets you log in once. Keep them somewhere safe.{' '}
          <strong className="font-semibold">You won't see them again.</strong>
        </p>
      </div>
      <ul className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-4 font-mono text-sm ring-1 ring-slate-200 sm:grid-cols-5">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(text).catch(() => {});
            setCopied(true);
          }}
        >
          <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button type="button" variant="secondary" onClick={download}>
          <Download aria-hidden="true" className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button type="button" onClick={onDone}>
          I've saved them
        </Button>
      </div>
    </div>
  );
}

function TurnOff({ busy, onSubmit }) {
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(password, code);
      }}
      className="space-y-4"
    >
      <p className="text-sm text-slate-600">
        To turn it off, confirm it's you with your password and a code from your app (or a recovery
        code).
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Password"
          name="disable-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <Field
          label="Code"
          name="disable-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          autoComplete="one-time-code"
          required
          minLength={6}
        />
      </div>
      <Button type="submit" variant="danger" disabled={busy}>
        {busy ? 'Turning off…' : 'Turn off two-step verification'}
      </Button>
    </form>
  );
}
