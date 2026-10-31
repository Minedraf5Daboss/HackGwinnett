import { IdCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { accommodationIcon } from '../accommodations.js';
import { api } from '../api.js';
import { Badge, Card, IconTile, LoadingCards } from '../components/ui.jsx';

/** The API's times are in UTC, sometimes without a time zone on the end. */
function formatDate(iso) {
  const utc = /(Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : `${iso}Z`;
  return new Date(utc).toLocaleDateString(undefined, { dateStyle: 'long' });
}

/** A passport someone shared, for clinic staff. Anyone with the link can open it. */
export default function SharedPassport() {
  const { token } = useParams();
  const [passport, setPassport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/shared-passports/${encodeURIComponent(token)}`)
      .then(setPassport)
      .catch((err) => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <Card className="mx-auto max-w-lg py-12 text-center">
        <IconTile icon={IdCard} size="lg" className="mx-auto" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          This passport isn't available
        </h1>
        <p className="mt-2 text-slate-600">
          {error}. The link may have been turned off. Ask the person who shared it for a new one.
        </p>
      </Card>
    );
  }
  if (!passport)
    return <LoadingCards count={1} label="Loading passport…" className="mx-auto h-96 max-w-2xl" />;

  const mustHaves = passport.accommodations.filter((a) => a.must_have);
  const niceToHaves = passport.accommodations.filter((a) => !a.must_have);

  return (
    <div className="mx-auto max-w-2xl">
      <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
        <header className="relative overflow-hidden bg-linear-to-br from-teal-800 via-teal-700 to-emerald-600 px-8 py-8 text-white">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 -right-16 h-64 w-64 rounded-full bg-emerald-300/30 blur-3xl"
          />
          <p className="relative flex items-center gap-2 text-sm font-medium text-teal-100">
            <IdCard aria-hidden="true" className="h-4 w-4" />
            Accessibility Passport
          </p>
          <h1 className="relative mt-2 text-3xl font-semibold tracking-tight">
            {passport.name ? `What ${passport.name} needs` : 'What this patient needs'} at
            appointments
          </h1>
          <p className="relative mt-2 text-sm text-teal-100">
            Shared so the visit goes smoothly · Updated {formatDate(passport.updated_at)}
          </p>
        </header>

        <div className="space-y-8 p-8">
          {passport.accommodations.length === 0 && (
            <p className="text-slate-600">No accommodations are listed.</p>
          )}
          {mustHaves.length > 0 && (
            <AccommodationList title="Must have" accommodations={mustHaves} highlight />
          )}
          {niceToHaves.length > 0 && (
            <AccommodationList title="Nice to have" accommodations={niceToHaves} />
          )}
          {passport.notes && (
            <section>
              <h2 className="text-sm font-semibold tracking-wide text-slate-500 uppercase">
                Notes
              </h2>
              <p className="mt-3 border-l-4 border-teal-600 bg-teal-50/60 py-3 pr-4 pl-4 text-lg whitespace-pre-line">
                {passport.notes}
              </p>
            </section>
          )}
        </div>
      </article>
      <p className="mt-4 text-center text-xs text-slate-500">Shared from MedAssist · Read-only</p>
    </div>
  );
}

function AccommodationList({ title, accommodations, highlight = false }) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-500 uppercase">
        {title}
        <Badge tone={highlight ? 'solid' : 'slate'}>{accommodations.length}</Badge>
      </h2>
      <ul className="mt-3 space-y-2">
        {accommodations.map((a) => {
          const Icon = accommodationIcon(a.id);
          return (
            <li
              key={a.id}
              className={`flex gap-4 rounded-2xl p-4 ${
                highlight ? 'bg-teal-50/70 ring-1 ring-teal-600/20' : 'bg-slate-50'
              }`}
            >
              <span
                aria-hidden="true"
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                  highlight
                    ? 'bg-teal-700 text-white'
                    : 'bg-white text-teal-700 ring-1 ring-slate-200'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-lg font-medium">{a.label}</p>
                <p className="text-slate-600">{a.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
