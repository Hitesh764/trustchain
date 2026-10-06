export default function Input({ label, error, className = "", id, ...props }) {
  const inputId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
        </label>
      )}
      <input id={inputId} className="field-input" {...props} />
      {error && <p className="mt-1.5 text-xs font-medium text-danger-600 dark:text-danger-300">{error}</p>}
    </div>
  );
}
