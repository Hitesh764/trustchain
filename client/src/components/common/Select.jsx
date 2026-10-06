export default function Select({ label, error, className = "", id, options, ...props }) {
  const selectId = id || props.name;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="field-label">
          {label}
        </label>
      )}
      <select id={selectId} className="field-input" {...props}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs font-medium text-danger-600 dark:text-danger-300">{error}</p>}
    </div>
  );
}
