import { Link } from 'react-router';

export default function NotFound() {
  return (
    <div className="text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-slate-600">
        <Link to="/" className="font-medium text-teal-700 hover:underline">
          Go back home
        </Link>
      </p>
    </div>
  );
}
