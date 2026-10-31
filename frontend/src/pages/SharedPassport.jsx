import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api } from '../api.js';
import { Card } from '../components/ui.jsx';

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
      <Card className="text-center">
        <h1 className="text-2xl font-bold">This passport isn't available</h1>
        <p className="mt-2 text-slate-600">
          {error}. The link may have been turned off. Ask the person who shared it for a new one.
        </p>
      </Card>
    );
  }
  if (!passport) return <p className="text-slate-500">Loading passport…</p>;

  const mustHaves = passport.accommodations.filter((a) => a.must_have);
  const niceToHaves = passport.accommodations.filter((a) => !a.must_have);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold tracking-wide text-teal-700 uppercase">
          Accessibility Passport
        </p>
        <h1 className="mt-1 text-3xl font-bold">
          {passport.name ? `What ${passport.name} needs` : 'What this patient needs'} at
          appointments
        </h1>
        <p className="mt-2 text-slate-600">
          Shared so the visit goes smoothly. Last updated {formatDate(passport.updated_at)}.
        </p>
      </div>

      {passport.accommodations.length === 0 && (
        <Card>
          <p className="text-slate-600">No accommodations are listed.</p>
        </Card>
      )}
      {mustHaves.length > 0 && (
        <AccommodationList title="Must have" accommodations={mustHaves} highlight />
      )}
      {niceToHaves.length > 0 && (
        <AccommodationList title="Nice to have" accommodations={niceToHaves} />
      )}

      {passport.notes && (
        <Card>
          <h2 className="text-lg font-semibold">Notes</h2>
          <p className="mt-2 text-lg whitespace-pre-line">{passport.notes}</p>
        </Card>
      )}
    </div>
  );
}

function AccommodationList({ title, accommodations, highlight = false }) {
  return (
    <Card className={highlight ? 'ring-2 ring-teal-600' : ''}>
      <h2 className="text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-3">
        {accommodations.map((a) => (
          <li key={a.id}>
            <p className="text-lg font-medium">{a.label}</p>
            <p className="text-slate-600">{a.description}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
}
