import { Link } from 'react-router';
import { useAuth } from '../auth.jsx';
import { buttonClass } from '../components/ui.jsx';

const FEATURES = [
  {
    title: 'Accessibility Passport',
    text: 'List the support you need at appointments, from an ASL interpreter to a quiet room, and share it with clinic staff.',
    to: '/passport',
  },
  {
    title: 'Find a clinic that fits',
    text: 'Search local clinics and see which ones have your must-haves, ranked by your passport.',
    to: '/clinics',
  },
  {
    title: 'Plain-language helper',
    text: 'Paste a visit summary or prescription and get the medical jargon in everyday words.',
    to: '/simplify',
  },
  {
    title: 'Health profile',
    text: 'Allergies, medications, conditions, and an emergency contact. Only you can see it.',
    to: '/profile',
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-teal-700 px-6 py-10 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Care that fits the way you need it.</h1>
        <p className="mt-3 max-w-xl text-lg text-teal-50">
          Tell clinics what you need before you arrive, find the ones that can provide it, and
          understand what your doctor wrote.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Link to="/passport" className={buttonClass('light')}>
              Go to my passport
            </Link>
          ) : (
            <>
              <Link to="/register" className={buttonClass('light')}>
                Get started
              </Link>
              <Link to="/clinics" className={buttonClass('outline')}>
                Find a clinic
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <Link
            key={feature.title}
            to={feature.to}
            className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-600"
          >
            <h2 className="font-semibold text-teal-800">{feature.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{feature.text}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
