import { HeartPulse, LockKeyhole } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import TwoFactorCard from '../components/TwoFactorCard.jsx';
import { Alert, Button, Card, Field, LoadingCards, PageHeader } from '../components/ui.jsx';

// The form, section by section. To add a field: add a column to Profile in
// backend/src/app/models.py and to ProfileUpdate in schemas.py, run
// `make revision m="add <field>"` and `make migrate`, then list it here.
const SECTIONS = [
  {
    title: 'About you',
    description: 'The basics clinics ask for when you check in.',
    fields: [
      { name: 'full_name', label: 'Full name', autoComplete: 'name' },
      { name: 'date_of_birth', label: 'Date of birth', type: 'date', autoComplete: 'bday' },
      { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
    ],
  },
  {
    title: 'Emergency contact',
    description: 'Who to call if something happens.',
    fields: [
      { name: 'emergency_contact_name', label: 'Name' },
      { name: 'emergency_contact_phone', label: 'Phone', type: 'tel' },
    ],
  },
  {
    title: 'Health information',
    description: "Keep these up to date so they're ready at every appointment.",
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
      <LoadingCards label="Loading your profile…" className="h-40" />
    );
  }

  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

  return (
    <div className="space-y-10">
      <form onSubmit={handleSubmit} className="space-y-10">
        <PageHeader icon={HeartPulse} title="My health profile">
          Only you can see this. Leave anything blank that you'd rather not share.
        </PageHeader>

        {SECTIONS.map((section) => (
          <SettingsRow key={section.title} title={section.title} description={section.description}>
            <Card className="grid gap-5 sm:grid-cols-2">
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
            </Card>
          </SettingsRow>
        ))}

        {/* Floats at the bottom of the screen, so saving is always one click away. */}
        <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-lg shadow-slate-900/5 backdrop-blur">
          {status ? (
            <div className="mr-auto">
              <Alert kind={status.kind}>{status.message}</Alert>
            </div>
          ) : (
            <p className="mr-auto flex items-center gap-2 text-sm text-slate-500">
              <LockKeyhole aria-hidden="true" className="h-4 w-4 text-teal-700" />
              Private to you. Not included in shared passports.
            </p>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </form>

      <SettingsRow title="Security" description="Protect your account with a second step at login.">
        <TwoFactorCard />
      </SettingsRow>
    </div>
  );
}

/** A section of a settings page: its title and description beside its content. */
function SettingsRow({ title, description, children }) {
  return (
    <section className="grid gap-4 md:grid-cols-[15rem_1fr] md:gap-8">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
