import { IdCard, Search, ShieldCheck } from 'lucide-react';

const POINTS = [
  { icon: IdCard, text: 'Share the support you need before you arrive.' },
  { icon: Search, text: 'Find the clinics that have your must-haves.' },
  { icon: ShieldCheck, text: 'Keep it private with two-step verification.' },
];

/** The frame around the login, sign-up, and 2FA code forms: a brand panel and the form. */
export default function AuthShell({ children }) {
  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xl shadow-slate-900/5 md:grid-cols-[1fr_1.1fr]">
      <div className="relative hidden overflow-hidden bg-linear-to-br from-teal-800 via-teal-700 to-emerald-600 p-10 text-white md:block">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-20 -bottom-24 h-72 w-72 rounded-full bg-emerald-300/30 blur-3xl"
        />
        <p className="relative text-sm font-medium text-teal-100">MedAssist</p>
        <p className="relative mt-3 text-2xl font-semibold tracking-tight">
          Walk in prepared. Leave understood.
        </p>
        <ul className="relative mt-10 space-y-5">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/15 ring-1 ring-white/20"
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="text-teal-50">{text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-8 sm:p-10">{children}</div>
    </div>
  );
}
