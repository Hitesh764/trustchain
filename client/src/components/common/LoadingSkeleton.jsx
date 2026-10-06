export default function LoadingSkeleton({ rows = 3, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`} aria-label="Loading" role="status">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton h-12 w-full" />
      ))}
    </div>
  );
}
