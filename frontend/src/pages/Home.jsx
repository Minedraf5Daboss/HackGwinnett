import {
  ArrowRight,
  BookOpenText,
  CircleCheck,
  Hand,
  HeartPulse,
  IdCard,
  Search,
  ShieldCheck,
  VolumeX,
} from 'lucide-react';
import { Link } from 'react-router';
import { useAuth } from '../auth.jsx';
import { IconTile, buttonClass } from '../components/ui.jsx';

const FEATURES = [
  {
    icon: IdCard,
    title: 'Accessibility Passport',
    text: 'List the support you need at appointments, from an ASL interpreter to a quiet room, and share it with clinic staff.',
    to: '/passport',
  },
  {
    icon: Search,
    title: 'Find a clinic that fits',
    text: 'Search local clinics and see which ones have your must-haves, ranked by your passport.',
    to: '/clinics',
  },
  {
    icon: BookOpenText,
    title: 'Plain-language helper',
    text: 'Paste a visit summary or prescription and get the medical jargon in everyday words.',
    to: '/simplify',
  },
  {
    icon: HeartPulse,
    title: 'Health profile',
    text: 'Allergies, medications, conditions, and an emergency contact, protected by two-step verification.',
    to: '/profile',
  },
];

const STEPS = [
  ['Make your passport', 'Pick the support you need and mark your must-haves.'],
  ['Find the right clinic', 'See which clinics offer everything you can’t do without.'],
  ['Share it ahead of time', 'Send staff a read-only link so they’re ready when you arrive.'],
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl bg-linear-to-br from-teal-800 via-teal-700 to-emerald-600 px-6 py-10 text-white shadow-lg shadow-teal-900/10 sm:px-10 sm:py-14">
        {/* Soft glows for depth. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-teal-300/20 blur-3xl"
        />

        <div className="relative grid items-center gap-10 lg:grid-cols-[1fr_18rem]">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium text-teal-50 ring-1 ring-white/20">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Accessible care, planned ahead
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Care that fits the way you need it.
            </h1>
            <p className="mt-4 max-w-xl text-lg text-teal-50">
              Tell clinics what you need before you arrive, find the ones that can provide it, and
              understand what your doctor wrote.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {user ? (
                <Link to="/passport" className={buttonClass('light')}>
                  Go to my passport
                  <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/register" className={buttonClass('light')}>
                    Get started
                    <ArrowRight aria-hidden="true" className="ml-1.5 h-4 w-4" />
                  </Link>
                  <Link to="/clinics" className={buttonClass('outline')}>
                    Find a clinic
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* A sample passport, to show what you'll make. */}
          <div
            aria-hidden="true"
            className="hidden rotate-2 rounded-2xl bg-white p-5 text-slate-900 shadow-2xl shadow-teal-950/30 transition-transform motion-safe:hover:rotate-0 lg:block"
          >
            <p className="text-xs font-semibold tracking-wide text-teal-700 uppercase">
              Accessibility Passport
            </p>
            <p className="mt-1 font-semibold">What Ada needs</p>
            <ul className="mt-4 space-y-2 text-sm">
              <SampleNeed icon={Hand} label="ASL interpreter" must />
              <SampleNeed icon={VolumeX} label="Low-sensory room" />
            </ul>
            <p className="mt-4 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
              <CircleCheck className="h-4 w-4" />
              Sunrise Clinic has all your must-haves
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Link
            key={feature.title}
            to={feature.to}
            className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:-translate-y-0.5 hover:border-teal-600/50 hover:shadow-md motion-reduce:hover:translate-y-0"
          >
            <IconTile icon={feature.icon} />
            <div>
              <h2 className="flex items-center gap-1 font-semibold text-teal-800">
                {feature.title}
                <ArrowRight
                  aria-hidden="true"
                  className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100"
                />
              </h2>
              <p className="mt-1 text-sm text-slate-600">{feature.text}</p>
            </div>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="text-xl font-bold">How it works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map(([title, text], index) => (
            <li key={title} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-sm font-bold text-white">
                {index + 1}
              </span>
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-slate-600">{text}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function SampleNeed({ icon: Icon, label, must = false }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-teal-700" />
        {label}
      </span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          must ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
        }`}
      >
        {must ? 'Must-have' : 'Nice to have'}
      </span>
    </li>
  );
}
