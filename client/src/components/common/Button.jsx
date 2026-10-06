const VARIANTS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  success: "btn-success",
  danger: "btn-danger",
  ghost: "btn-ghost",
};

export default function Button({ variant = "primary", loading = false, className = "", children, ...props }) {
  return (
    <button className={`${VARIANTS[variant]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && (
        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
