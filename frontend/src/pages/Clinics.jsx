import {
  CircleAlert,
  CircleCheck,
  Clock,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Search,
  SearchX,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { accommodationIcon, byCategory, useAccommodations } from '../accommodations.js';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import {
  Alert,
  Badge,
  Button,
  Card,
  IconTile,
  LoadingCards,
  PageHeader,
  buttonClass,
  checkClass,
  inputClass,
} from '../components/ui.jsx';

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
  const [showMoreFilters, setShowMoreFilters] = useState(false); // on small screens

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
  const filtered = Boolean(q.trim() || type || required.length || position);

  function clearFilters() {
    setQ('');
    setType('');
    setRequired([]);
    setPosition(null);
  }

  return (
    <div className="space-y-8">
      <PageHeader icon={Search} title="Find a clinic">
        Search clinics around Gwinnett County and see the accessibility support each one offers.
      </PageHeader>

      <div className="grid gap-8 lg:grid-cols-[19rem_1fr] lg:items-start">
        <Card
          as="form"
          role="search"
          aria-label="Filter clinics"
          onSubmit={(e) => e.preventDefault()}
          className="space-y-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto"
        >
          <div>
            <label htmlFor="q" className="block text-sm font-medium text-slate-700">
              Search
            </label>
            <div className="relative mt-1.5">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <input
                id="q"
                type="search"
                placeholder="Name, city, ZIP, or support"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className={`${inputClass} pl-10`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700">
              Clinic type
            </label>
            <select
              id="type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              className={`mt-1.5 ${inputClass}`}
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {position ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-teal-50 px-3.5 py-2.5 text-sm text-teal-900">
                <span className="flex items-center gap-2">
                  <LocateFixed aria-hidden="true" className="h-4 w-4" />
                  Sorted by distance from you.
                </span>
                <button
                  type="button"
                  onClick={() => setPosition(null)}
                  className="font-medium text-teal-700 hover:underline"
                >
                  Clear
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="secondary"
                onClick={locate}
                disabled={locating}
                className="w-full"
              >
                <LocateFixed aria-hidden="true" />
                {locating ? 'Finding you…' : 'Use my location'}
              </Button>
            )}
            {locationError && <Alert>{locationError}</Alert>}

            {user && myNeeds?.length > 0 && (
              <label className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm font-medium">
                Best fit for my passport first
                <input
                  type="checkbox"
                  checked={rankByPassport}
                  onChange={(event) => setRankByPassport(event.target.checked)}
                  className={checkClass}
                />
              </label>
            )}
            {user && myNeeds?.length === 0 && (
              <p className="text-sm text-slate-600">
                Fill in{' '}
                <Link to="/passport" className="font-medium text-teal-700 hover:underline">
                  your passport
                </Link>{' '}
                to see the clinics that fit you best.
              </p>
            )}
            {!authLoading && !user && (
              <p className="text-sm text-slate-600">
                <Link to="/login" className="font-medium text-teal-700 hover:underline">
                  Log in
                </Link>{' '}
                to rank clinics by your Accessibility Passport.
              </p>
            )}
          </div>

          {accommodations && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowMoreFilters((show) => !show)}
              aria-expanded={showMoreFilters}
              aria-controls="accommodation-filters"
              className="w-full lg:hidden"
            >
              <SlidersHorizontal aria-hidden="true" />
              {showMoreFilters ? 'Fewer filters' : 'More filters'}
              {required.length > 0 && ` (${required.length})`}
            </Button>
          )}

          {accommodations && (
            <fieldset
              id="accommodation-filters"
              className={showMoreFilters ? '' : 'hidden lg:block'}
            >
              <legend className="text-sm font-medium text-slate-700">Only show clinics with</legend>
              <div className="mt-3 space-y-4">
                {byCategory(accommodations).map(([category, items]) => (
                  <div key={category}>
                    <p className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
                      {category}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {items.map((a) => (
                        <FilterChip
                          key={a.id}
                          accommodation={a}
                          checked={required.includes(a.id)}
                          onChange={(checked) => toggleRequired(a.id, checked)}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}

          {filtered && (
            <Button type="button" variant="ghost" onClick={clearFilters} className="w-full">
              <X aria-hidden="true" />
              Clear filters
            </Button>
          )}
        </Card>

        <section aria-label="Results" className="min-w-0 space-y-4">
          {error && <Alert>{error}</Alert>}
          {clinics === null ? (
            !error && <LoadingCards count={3} label="Loading clinics…" className="h-48" />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p aria-live="polite" className="text-sm font-medium text-slate-600">
                  {clinics.length} {clinics.length === 1 ? 'clinic' : 'clinics'}
                  {ranked && ', best fit first'}
                </p>
                {ranked && <Badge tone="teal">Ranked by your passport</Badge>}
              </div>
              {clinics.length === 0 ? (
                <Card className="flex flex-col items-center py-12 text-center">
                  <IconTile icon={SearchX} size="lg" />
                  <h2 className="mt-4 font-semibold">No clinics match</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Try a different search or fewer filters.
                  </p>
                  <Button type="button" variant="secondary" onClick={clearFilters} className="mt-5">
                    Clear filters
                  </Button>
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}

/** An accommodation to filter by, as a toggle chip. */
function FilterChip({ accommodation, checked, onChange }) {
  const Icon = accommodationIcon(accommodation.id);
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-700 ${
        checked
          ? 'bg-teal-700 text-white ring-teal-700'
          : 'bg-white text-slate-700 ring-slate-200 hover:ring-slate-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {accommodation.label}
    </label>
  );
}

function ClinicCard({ clinic, labels, hasMustHaves }) {
  const { match } = clinic;
  const met = new Set(match?.met);
  const address = `${clinic.street}, ${clinic.city}, ${clinic.state} ${clinic.zip}`;

  return (
    <Card as="article" className="transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{clinic.name}</h2>
            <Badge>{clinic.type}</Badge>
          </div>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              {address}
            </span>
            {clinic.distance_miles !== null && (
              <span className="inline-flex items-center gap-1 font-medium text-teal-800">
                <Navigation aria-hidden="true" className="h-3.5 w-3.5" />
                {clinic.distance_miles} mi away
              </span>
            )}
          </p>
        </div>
        {match && <MatchSummary match={match} labels={labels} hasMustHaves={hasMustHaves} />}
      </div>

      <ul aria-label="Accessibility support" className="mt-4 flex flex-wrap gap-1.5">
        {clinic.accommodations.map((a) => {
          const Icon = accommodationIcon(a.id);
          return (
            <li
              key={a.id}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                met.has(a.id)
                  ? 'bg-teal-50 text-teal-900 ring-1 ring-teal-600/30'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              {met.has(a.id) && <span className="sr-only">In your passport: </span>}
              {a.label}
              {a.note && <span className="font-normal text-slate-500"> · {a.note}</span>}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        <a href={`tel:${clinic.phone.replace(/[^\d+]/g, '')}`} className={buttonClass('secondary')}>
          <Phone aria-hidden="true" />
          {clinic.phone}
        </a>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
          target="_blank"
          rel="noreferrer"
          className={buttonClass('secondary')}
        >
          <Navigation aria-hidden="true" />
          Directions
        </a>
        {clinic.hours && (
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-500 sm:ml-auto">
            <Clock aria-hidden="true" className="h-4 w-4" />
            {clinic.hours}
          </span>
        )}
      </div>
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
