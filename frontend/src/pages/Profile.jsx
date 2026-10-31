import { HeartPulse } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TwoFactorCard from '../components/TwoFactorCard.jsx';
import { Alert, Button, Field, PageHeader } from '../components/ui.jsx';

// The form, section by section. To add a field: add a column to Profile in
// backend/src/app/models.py and to ProfileUpdate in schemas.py, run
// `make revision m="add <field>"` and `make migrate`, then list it here.
const SECTIONS = [
  {
    title: 'About you',
    fields: [
      { name: 'full_name', label: 'Full name', autoComplete: 'name' },
      { name: 'date_of_birth', label: 'Date of birth', type: 'date', autoComplete: 'bday' },
      { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
    ],
  },
  {
    title: 'Emergency contact',
    fields: [
      { name: 'emergency_contact_name', label: 'Name' },
      { name: 'emergency_contact_phone', label: 'Phone', type: 'tel' },
    ],
  },
  {
    title: 'Health information',
    fields: [
      { name: 'allergies', label: 'Allergies', multiline: true, hint: 'e.g. penicillin, peanuts' },
      { name: 'medications', label: 'Current medications', multiline: true },
      { name: 'conditions', label: 'Medical conditions', multiline: true },
    ],
  },
];

const FIELD_NAMES = SECTIONS.flatMap((section) => section.fields.map((field) => field.name));

/** Turn an API profile into form values (inputs need '' rather than null). */
function toForm(profile) {
  return Object.fromEntries(FIELD_NAMES.map((name) => [name, profile[name] ?? '']));
}

export default function Profile() {
  const [form, setForm] = useState(null);
  const [status, setStatus] = useState(null); // { kind: 'error' | 'success', message }
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api('/profile')
      .then((profile) => setForm(toForm(profile)))
      .catch((err) => setStatus({ kind: 'error', message: err.message }));
  }, []);

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
    setStatus(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      setForm(toForm(await api('/profile', { method: 'PATCH', body: form })));
      setStatus({ kind: 'success', message: 'Profile saved.' });
    } catch (err) {
      setStatus({ kind: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return status ? (
      <Alert>{status.message}</Alert>
    ) : (
      <p className="text-slate-500">Loading your profile…</p>
    );
  }

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <PageHeader icon={HeartPulse} title="My health profile">
          Only you can see this. Leave anything blank that you'd rather not share.
        </PageHeader>

        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {section.fields.map(({ name, ...field }) => (
                <Field
                  key={name}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  max={field.type === 'date' ? today : undefined}
                  className={field.multiline ? 'sm:col-span-2' : ''}
                  {...field}
                />
              ))}
            </div>
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
          {status && <Alert kind={status.kind}>{status.message}</Alert>}
        </div>
      </form>

      <TwoFactorCard />
    </div>
  );
}
