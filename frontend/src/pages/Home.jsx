import { Link } from 'react-router';
import { useAuth } from '../auth.jsx';
import { buttonClass } from '../components/ui.jsx';

const FEATURES = [
  {
    title: 'Health profile',
    text: 'Allergies, medications, and conditions you can update anytime.',
  },
  {
    title: 'Emergency contact',
    text: 'Who to call if something happens, saved with your profile.',
  },
  {
    title: 'Private by default',
    text: 'Your information is tied to your account and only you can see it.',
  },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-teal-700 px-6 py-10 text-white sm:px-10">
        <h1 className="text-3xl font-bold sm:text-4xl">Your health information, in one place.</h1>
        <p className="mt-3 max-w-xl text-lg text-teal-50">
          Keep your allergies, medications, conditions, and emergency contact ready for your next
          appointment.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {user ? (
            <Link to="/profile" className={buttonClass('light')}>
              Go to my profile
            </Link>
          ) : (
            <>
              <Link to="/register" className={buttonClass('light')}>
                Get started
              </Link>
              <Link to="/login" className={buttonClass('outline')}>
                Log in
              </Link>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-teal-800">{feature.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{feature.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
