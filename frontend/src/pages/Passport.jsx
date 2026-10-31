import { ArrowRight, Copy, ExternalLink, IdCard, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
  accommodationIcon,
  byCategory,
  categoryIcon,
  useAccommodations,
} from '../accommodations.js';
import { api } from '../api.js';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  IconTile,
  LoadingCards,
  PageHeader,
  buttonClass,
  checkClass,
  inputClass,
} from '../components/ui.jsx';

/** The full address of a shared passport page, to give to clinic staff. */
function shareUrl(token) {
  return `${window.location.origin}${import.meta.env.BASE_URL}shared/${token}`;
}

const sameChoices = (a, b) =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((id) => a[id] === b[id]);

export default function Passport() {
  const { accommodations, error: loadError } = useAccommodations();
  const [passport, setPassport] = useState(null); // as last saved
  const [chosen, setChosen] = useState({}); // accommodation id -> true if it's a must-have
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(null); // { kind: 'error' | 'success', message }
  const [saving, setSaving] = useState(false);

  function showSaved(saved) {
    setPassport(saved);
    setChosen(savedChoices(saved));
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
      <LoadingCards label="Loading your passport…" />
    );
  }

  const labels = Object.fromEntries(accommodations.map((a) => [a.id, a.label]));
  const mustHaves = Object.keys(chosen).filter((id) => chosen[id]);
  const niceToHaves = Object.keys(chosen).filter((id) => !chosen[id]);
  const unsaved = !sameChoices(chosen, savedChoices(passport)) || notes !== (passport.notes ?? '');

  return (
    <div className="space-y-8">
      <PageHeader icon={IdCard} title="My Accessibility Passport">
        Choose the support you need at appointments, and mark the ones you can't do without as{' '}
        <strong className="font-semibold text-slate-900">must-haves</strong>. We use it to find
        clinics that fit, and you can share it with clinic staff.
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[1fr_21rem] lg:items-start">
        <form id="passport-form" onSubmit={handleSubmit} className="space-y-8">
          {byCategory(accommodations).map(([category, items]) => {
            const Icon = categoryIcon(category);
            return (
              <section key={category}>
                <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
                  <Icon aria-hidden="true" className="h-4 w-4 text-teal-700" />
                  {category}
                </h2>
                <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                  {items.map((accommodation) => (
                    <AccommodationTile
                      key={accommodation.id}
                      accommodation={accommodation}
                      mustHave={chosen[accommodation.id] ?? null}
                      onChange={(mustHave) => choose(accommodation.id, mustHave)}
                    />
                  ))}
                </ul>
              </section>
            );
          })}

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
        </form>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Your passport</h2>
              {unsaved && <Badge tone="amber">Unsaved changes</Badge>}
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Must-haves" value={mustHaves.length} accent />
              <Stat label="Nice to have" value={niceToHaves.length} />
            </dl>
            <p aria-live="polite" className="sr-only">
              {mustHaves.length} must-{mustHaves.length === 1 ? 'have' : 'haves'},{' '}
              {niceToHaves.length} nice to have
            </p>
            {mustHaves.length + niceToHaves.length > 0 ? (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {[...mustHaves, ...niceToHaves].map((id) => (
                  <li key={id}>
                    <Badge tone={chosen[id] ? 'solid' : 'slate'}>{labels[id]}</Badge>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">
                Pick the support you need to get started.
              </p>
            )}

            <div className="mt-5 space-y-3">
              <Button type="submit" form="passport-form" disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save passport'}
              </Button>
              {status && <Alert kind={status.kind}>{status.message}</Alert>}
              {passport.accommodations.length > 0 && (
                <Link to="/clinics" className={`${buttonClass('secondary')} w-full`}>
                  Find clinics that fit
                  <ArrowRight aria-hidden="true" />
                </Link>
              )}
            </div>
          </Card>

          {passport.updated_at && (
            <ShareCard
              passport={passport}
              onChange={(changes) => setPassport((current) => ({ ...current, ...changes }))}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function savedChoices(passport) {
  return Object.fromEntries(passport.accommodations.map((a) => [a.id, a.must_have]));
}

function Stat({ label, value, accent = false }) {
  return (
    <div className={`rounded-xl p-3 ${accent ? 'bg-teal-50' : 'bg-slate-50'}`}>
      <dt className="text-xs font-medium text-slate-500">{label}</dt>
      <dd
        className={`mt-0.5 text-2xl font-semibold ${accent ? 'text-teal-800' : 'text-slate-800'}`}
      >
        {value}
      </dd>
    </div>
  );
}

/** One accommodation: a tile to tick, then must-have or nice-to-have once it's ticked. */
function AccommodationTile({ accommodation, mustHave, onChange }) {
  const { id, label, description } = accommodation;
  const checked = mustHave !== null;
  const Icon = accommodationIcon(id);

  return (
    <li
      className={`rounded-2xl border p-4 transition has-[input[type=checkbox]:focus-visible]:outline-2 has-[input[type=checkbox]:focus-visible]:outline-offset-2 has-[input[type=checkbox]:focus-visible]:outline-teal-700 ${
        checked
          ? 'border-teal-600/40 bg-teal-50/60 shadow-sm shadow-teal-900/5'
          : 'border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <label className="flex cursor-pointer gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked ? true : null)}
          className={`${checkClass} mt-1`}
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2 font-medium">
            <Icon
              aria-hidden="true"
              className={`h-4 w-4 shrink-0 ${checked ? 'text-teal-700' : 'text-slate-400'}`}
            />
            {label}
          </span>
          <span className="mt-0.5 block text-sm text-slate-600">{description}</span>
        </span>
      </label>
      {checked && (
        <fieldset className="mt-3 ml-7 inline-flex rounded-lg bg-white p-0.5 ring-1 ring-slate-200">
          <legend className="sr-only">How important is {label}?</legend>
          {[
            [true, 'Must-have'],
            [false, 'Nice to have'],
          ].map(([value, text]) => (
            <label
              key={text}
              className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-teal-700 ${
                mustHave === value
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
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
      <div className="flex items-start gap-3">
        <IconTile icon={Share2} />
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            Share with clinic staff
            {token && <Badge tone="emerald">On</Badge>}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            A read-only link to your latest saved passport. Your health profile isn't included.
          </p>
        </div>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeName}
          disabled={busy}
          onChange={(event) => {
            setIncludeName(event.target.checked);
            if (token) share(event.target.checked);
          }}
          className={checkClass}
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
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl(token)}
              aria-label="Share link"
              onFocus={(event) => event.target.select()}
              className={`${inputClass} min-w-0 flex-1 font-mono text-xs`}
            />
            <Button type="button" variant="secondary" onClick={copy} aria-label="Copy link">
              <Copy aria-hidden="true" />
            </Button>
          </div>
          <div className="flex gap-2">
            <a
              href={shareUrl(token)}
              target="_blank"
              rel="noreferrer"
              className={`${buttonClass('secondary')} flex-1`}
            >
              <ExternalLink aria-hidden="true" />
              Preview
            </a>
            <Button
              type="button"
              variant="danger"
              onClick={stopSharing}
              disabled={busy}
              className="flex-1"
            >
              Stop sharing
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          className="mt-4 w-full"
          onClick={() => share(includeName)}
          disabled={busy}
        >
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
