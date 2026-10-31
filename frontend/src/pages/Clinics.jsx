import {
  CircleAlert,
  CircleCheck,
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accommodationIcon, byCategory, useAccommodations } from '../accommodations.js';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Alert, Button, Card, Field, PageHeader, inputClass } from '../components/ui.jsx';

export default function Clinics() {
  const { user, loading: authLoading } = useAuth();
  const { accommodations } = useAccommodations();
  const [types, setTypes] = useState([]);
  const [myNeeds, setMyNeeds] = useState(null); // the passport's accommodations; null if unknown

  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [required, setRequired] = useState([]); // ids every clinic shown must offer
  const [position, setPosition] = useState(null); // { lat, lng } to sort by distance from
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [rankByPassport, setRankByPassport] = useState(true);

  const [clinics, setClinics] = useState(null);
  const [error, setError] = useState(null);

  const labels = useMemo(
    () => Object.fromEntries((accommodations ?? []).map((a) => [a.id, a.label])),
    [accommodations],
  );

  useEffect(() => {
    api('/clinics/types')
      .then(setTypes)
      .catch(() => {}); // the dropdown just stays empty
  }, []);

  useEffect(() => {
    setMyNeeds(null);
    if (!user) return;
    api('/passport')
      .then((passport) => setMyNeeds(passport.accommodations))
      .catch(() => setMyNeeds([]));
  }, [user]);

  // Wait to find out whether there's a passport to rank by, so results don't jump around.
  const ready = !authLoading && (!user || myNeeds !== null);
  const ranked = Boolean(user) && myNeeds?.length > 0 && rankByPassport;
  const requiredKey = required.join(',');

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (type) params.set('type', type);
    if (requiredKey) params.set('accommodations', requiredKey);
    if (position) {
      params.set('lat', position.lat);
      params.set('lng', position.lng);
    }
    let ignore = false;
    // Wait for a pause in typing before searching.
    const timer = setTimeout(() => {
      api(`${ranked ? '/passport/matches' : '/clinics'}?${params}`)
        .then((results) => {
          if (ignore) return;
          setClinics(results);
          setError(null);
        })
        .catch((err) => !ignore && setError(err.message));
    }, 250);
    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [ready, q, type, requiredKey, position, ranked]);

  function toggleRequired(id, checked) {
    setRequired((current) => (checked ? [...current, id] : current.filter((x) => x !== id)));
  }

  function locate() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError("Your browser can't share your location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ lat: coords.latitude.toFixed(4), lng: coords.longitude.toFixed(4) });
        setLocating(false);
      },
      () => {
        setLocationError("We couldn't get your location. Check that location access is allowed.");
        setLocating(false);
      },
      { timeout: 10000 },
    );
  }

  const hasMustHaves = myNeeds?.some((a) => a.must_have) ?? false;

  return (
    <div className="space-y-6">
      <PageHeader icon={Search} title="Find a clinic">
        Search clinics around Gwinnett County and see the accessibility support each one offers.
      </PageHeader>

      <Card as="form" role="search" onSubmit={(e) => e.preventDefault()} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_14rem]">
          <Field
            label="Search"
            name="q"
            type="search"
            placeholder="Name, city, ZIP code, or support (e.g. ASL)"
            value={q}
            onChange={(event) => setQ(event.target.value)}
          />
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700">
              Clinic type
            </label>
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={`mt-1 ${inputClass}`}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {accommodations && (
          <details className="rounded-lg border border-slate-200 px-4 py-3">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">
              <SlidersHorizontal aria-hidden="true" className="mr-1.5 inline h-4 w-4" />
              Only show clinics with…
              {required.length > 0 && ` (${required.length} selected)`}
            </summary>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {byCategory(accommodations).map(([category, items]) => (
                <fieldset key={category}>
                  <legend className="text-sm font-semibold text-slate-500">{category}</legend>
                  {items.map((a) => (
                    <label key={a.id} className="mt-1 flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={required.includes(a.id)}
                        onChange={(event) => toggleRequired(a.id, event.target.checked)}
                        className="h-4 w-4 accent-teal-700"
                      />
                      {a.label}
                    </label>
                  ))}
                </fieldset>
              ))}
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {position ? (
            <p>
              Sorted by distance from you.{' '}
              <button
                type="button"
                onClick={() => setPosition(null)}
                className="font-medium text-teal-700 hover:underline"
              >
                Clear
              </button>
            </p>
          ) : (
            <Button type="button" variant="secondary" onClick={locate} disabled={locating}>
              <LocateFixed aria-hidden="true" className="mr-2 h-4 w-4" />
              {locating ? 'Finding you…' : 'Use my location'}
            </Button>
          )}
          {user && myNeeds?.length > 0 && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={rankByPassport}
                onChange={(event) => setRankByPassport(event.target.checked)}
                className="h-4 w-4 accent-teal-700"
              />
              Best fit for my passport first
            </label>
          )}
          {user && myNeeds?.length === 0 && (
            <p className="text-slate-600">
              Fill in{' '}
              <Link to="/passport" className="font-medium text-teal-700 hover:underline">
                your passport
              </Link>{' '}
              to see the clinics that fit you best.
            </p>
          )}
          {!authLoading && !user && (
            <p className="text-slate-600">
              <Link to="/login" className="font-medium text-teal-700 hover:underline">
                Log in
              </Link>{' '}
              to see the clinics that fit your Accessibility Passport best.
            </p>
          )}
        </div>
        {locationError && <Alert>{locationError}</Alert>}
      </Card>

      {error && <Alert>{error}</Alert>}
      {clinics === null ? (
        !error && <p className="text-slate-500">Loading clinics…</p>
      ) : (
        <section aria-label="Results" className="space-y-4">
          <p aria-live="polite" className="text-sm text-slate-600">
            {clinics.length} {clinics.length === 1 ? 'clinic' : 'clinics'}
            {ranked && ', best fit first'}
          </p>
          {clinics.length === 0 ? (
            <Card>
              <p className="text-slate-600">No clinics match. Try removing a filter.</p>
            </Card>
          ) : (
            <ul className="space-y-4">
              {clinics.map((clinic) => (
                <li key={clinic.id}>
                  <ClinicCard clinic={clinic} labels={labels} hasMustHaves={hasMustHaves} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function ClinicCard({ clinic, labels, hasMustHaves }) {
  const { match } = clinic;
  const met = new Set(match?.met);
  const address = `${clinic.street}, ${clinic.city}, ${clinic.state} ${clinic.zip}`;

  return (
    <Card as="article">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{clinic.name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
              {clinic.type}
            </span>
            {clinic.city}
            {clinic.distance_miles !== null && (
              <span className="inline-flex items-center gap-1 text-teal-800">
                <Navigation aria-hidden="true" className="h-3.5 w-3.5" />
                {clinic.distance_miles} mi away
              </span>
            )}
          </p>
        </div>
        {match && <MatchSummary match={match} labels={labels} hasMustHaves={hasMustHaves} />}
      </div>

      <div className="mt-4 space-y-1.5 text-sm text-slate-700">
        <p className="flex items-start gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <span>
            {address} ·{' '}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-teal-700 hover:underline"
            >
              Directions
            </a>
          </span>
        </p>
        <p className="flex items-center gap-2">
          <Phone aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
          <a
            href={`tel:${clinic.phone.replace(/[^\d+]/g, '')}`}
            className="font-medium text-teal-700 hover:underline"
          >
            {clinic.phone}
          </a>
          {clinic.hours && (
            <>
              <Clock aria-hidden="true" className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
              {clinic.hours}
            </>
          )}
        </p>
      </div>

      <ul aria-label="Accessibility support" className="mt-4 flex flex-wrap gap-2">
        {clinic.accommodations.map((a) => {
          const Icon = accommodationIcon(a.id);
          return (
            <li
              key={a.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm ${
                met.has(a.id)
                  ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-600/40'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {met.has(a.id) && <span className="sr-only">In your passport: </span>}
              {a.label}
              {a.note && <span className="text-slate-500"> · {a.note}</span>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** How well a clinic fits the user's passport. */
function MatchSummary({ match, labels, hasMustHaves }) {
  const total = match.met.length + match.missing.length;
  const missingMust = match.missing_must_haves;

  let headline = `Has ${match.met.length} of your ${total} needs`;
  let colors = 'bg-slate-100 text-slate-800';
  let bar = 'bg-teal-600';
  let Icon = CircleCheck;
  if (hasMustHaves && missingMust.length === 0) {
    headline = 'Has all your must-haves';
    colors = 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-600/20';
    bar = 'bg-emerald-600';
  } else if (hasMustHaves) {
    const count = missingMust.length === 1 ? 'a must-have' : `${missingMust.length} must-haves`;
    headline = `Missing ${count}`;
    colors = 'bg-amber-50 text-amber-900 ring-1 ring-amber-600/20';
    bar = 'bg-amber-500';
    Icon = CircleAlert;
  }

  return (
    <div className={`w-full max-w-xs rounded-xl px-3 py-2.5 text-sm sm:w-64 ${colors}`}>
      <p className="flex items-center gap-1.5 font-semibold">
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        {headline}
      </p>
      <div
        role="meter"
        aria-label="Your needs this clinic meets"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={match.met.length}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/80 ring-1 ring-black/5"
      >
        <div
          className={`h-full rounded-full ${bar} transition-[width] duration-500`}
          style={{ width: `${Math.round(match.score * 100)}%` }}
        />
      </div>
      {hasMustHaves && (
        <p className="mt-1.5">
          {match.met.length} of {total} of your needs
        </p>
      )}
      {match.missing.length > 0 && (
        <p>
          Doesn't offer:{' '}
          {match.missing
            .map((id) =>
              missingMust.includes(id) ? `${labels[id] ?? id} (must-have)` : (labels[id] ?? id),
            )
            .join(', ')}
        </p>
      )}
    </div>
  );
}
