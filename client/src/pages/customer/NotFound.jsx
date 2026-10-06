import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
      <p className="text-6xl font-bold text-brand-600 dark:text-brand-400">404</p>
      <p className="mt-3 text-slate-500 dark:text-slate-400">
        This page doesn't exist — unlike our product records.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Back to Home
      </Link>
    </div>
  );
}
