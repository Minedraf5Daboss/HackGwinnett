import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { byCategory, useAccommodations } from '../accommodations.js';
import { api } from '../api.js';
import { Alert, Button, Card, Field, buttonClass, inputClass } from '../components/ui.jsx';

/** The full address of a shared passport page, to give to clinic staff. */
function shareUrl(token) {
  return `${window.location.origin}${import.meta.env.BASE_URL}shared/${token}`;
}

export default function Passport() {
  const { accommodations, error: loadError } = useAccommodations();
  const [passport, setPassport] = useState(null); // as last saved
  const [chosen, setChosen] = useState({}); // accommodation id -> true if it's a must-have
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'error' | 'success', message }
  const [saving, setSaving] = useState(false);

  function showSaved(saved) {
    setPassport(saved);
    setChosen(Object.fromEntries(saved.accommodations.map((a) => [a.id, a.must_have])));
    setNotes(saved.notes ?? '');
  }

  useEffect(() => {
    api('/passport')
      .then(showSaved)
      .catch((err) => setStatus({ kind: 'error', message: err.message }));
  }, []);

  function choose(id, mustHave) {
    setChosen((current) => {
      const next = { ...current };
      if (mustHave === null) delete next[id];
      else next[id] = mustHave;
      return next;
    });
    setStatus(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const body = {
        accommodations: Object.entries(chosen).map(([id, mustHave]) => ({
          id,
          must_have: mustHave,
        })),
        notes,
      };
      showSaved(await api('/passport', { method: 'PUT', body }));
      setStatus({ kind: 'success', message: 'Passport saved.' });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <Alert>{loadError}</Alert>;
  if (!passport || !accommodations) {
    return status ? (
      <Alert>{status.message}</Alert>
    ) : (
      <p className="text-slate-500">Loading your passport…</p>
    );
  }

  const mustHaveCount = Object.values(chosen).filter(Boolean).length;
  const niceCount = Object.keys(chosen).length - mustHaveCount;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Accessibility Passport</h1>
          <p className="mt-1 text-slate-600">
            Choose the support you need at appointments. Mark the ones you can't do without as{' '}
            <strong className="font-semibold">must-haves</strong>. We use your passport to find
            clinics that fit, and you can share it with clinic staff.
          </p>
        </div>

        {byCategory(accommodations).map(([category, items]) => (
          <Card key={category}>
            <h2 className="text-lg font-semibold">{category}</h2>
            <ul className="mt-2 divide-y divide-slate-100">
              {items.map((accommodation) => (
                <AccommodationChoice
                  key={accommodation.id}
                  accommodation={accommodation}
                  mustHave={chosen[accommodation.id] ?? null}
                  onChange={(mustHave) => choose(accommodation.id, mustHave)}
                />
              ))}
            </ul>
          </Card>
        ))}

        <Card>
          <Field
            label="Notes for clinic staff"
            name="notes"
            multiline
            maxLength={2000}
            value={notes}
            onChange={(event) => {
              setNotes(event.target.value);
              setStatus(null);
            }}
            hint='Anything else that helps, e.g. "Please text instead of calling."'
          />
        </Card>

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save passport'}
          </Button>
          <p className="text-sm text-slate-600">
            {mustHaveCount} must-{mustHaveCount === 1 ? 'have' : 'haves'}, {niceCount} nice to
            have
          </p>
          {status && <Alert kind={status.kind}>{status.message}</Alert>}
        </div>
      </form>

      {passport.accommodations.length > 0 && (
        <Link to="/clinics" className={buttonClass('secondary')}>
          Find clinics that fit my passport
        </Link>
      )}

      {passport.updated_at && (
        <ShareCard
          passport={passport}
          onChange={(changes) => setPassport((current) => ({ ...current, ...changes }))}
        />
      )}
    </div>
  );
}

/** One accommodation: a checkbox, then must-have or nice-to-have once it's checked. */
function AccommodationChoice({ accommodation, mustHave, onChange }) {
  const { id, label, description } = accommodation;
  const checked = mustHave !== null;

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3">
      <label className="flex min-w-0 flex-1 cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked ? true : null)}
          className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
        />
        <span>
          <span className="font-medium">{label}</span>
          <span className="block text-sm text-slate-600">{description}</span>
        </span>
      </label>
      {checked && (
        <fieldset className="flex shrink-0 overflow-hidden rounded-lg text-sm ring-1 ring-slate-300">
          <legend className="sr-only">How important is {label}?</legend>
          {[
            [true, 'Must-have'],
            [false, 'Nice to have'],
          ].map(([value, text]) => (
            <label
              key={text}
              className={`cursor-pointer px-3 py-1.5 font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:-outline-offset-4 has-[:focus-visible]:outline-current ${
                mustHave === value
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name={`priority-${id}`}
                checked={mustHave === value}
                onChange={() => onChange(value)}
                className="sr-only"
              />
              {text}
            </label>
          ))}
        </fieldset>
      )}
    </li>
  );
}

/** Turn the read-only share link on or off. */
function ShareCard({ passport, onChange }) {
  const token = passport.share_token;
  const [includeName, setIncludeName] = useState(passport.share_include_name);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

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

  const share = (include_name) =>
    run(async () => {
      const shared = await api('/passport/share', { method: 'POST', body: { include_name } });
      onChange({ share_token: shared.token, share_include_name: shared.include_name });
    });

  const stopSharing = () =>
    run(async () => {
      await api('/passport/share', { method: 'DELETE' });
      onChange({ share_token: null });
      setStatus({ kind: 'success', message: 'Sharing is off. The old link no longer works.' });
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl(token));
      setStatus({ kind: 'success', message: 'Link copied.' });
    } catch {
      setStatus({ kind: 'error', message: "Couldn't copy. Select the link and copy it." });
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Share with clinic staff</h2>
      <p className="mt-1 text-sm text-slate-600">
        A read-only link to your passport. It doesn't include the rest of your health profile,
        always shows your latest saved passport, and you can turn it off anytime.
      </p>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeName}
          disabled={busy}
          onChange={(event) => {
            setIncludeName(event.target.checked);
            if (token) share(event.target.checked);
          }}
          className="h-4 w-4 accent-teal-700"
        />
        <span>
          Show my name (from{' '}
          <Link to="/profile" className="font-medium text-teal-700 hover:underline">
            my profile
          </Link>
          )
        </span>
      </label>

      {token ? (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <input
              readOnly
              value={shareUrl(token)}
              aria-label="Share link"
              onFocus={(event) => event.target.select()}
              className={`${inputClass} min-w-0 flex-1 font-mono text-sm`}
            />
            <Button type="button" variant="secondary" onClick={copy}>
              Copy link
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={shareUrl(token)}
              target="_blank"
              rel="noreferrer"
              className={buttonClass('secondary')}
            >
              Preview
            </a>
            <Button type="button" variant="secondary" onClick={stopSharing} disabled={busy}>
              Stop sharing
            </Button>
          </div>
        </div>
      ) : (
        <Button type="button" className="mt-4" onClick={() => share(includeName)} disabled={busy}>
          Create share link
        </Button>
      )}

      {status && (
        <div className="mt-3">
          <Alert kind={status.kind}>{status.message}</Alert>
        </div>
      )}
    </Card>
  );
}
