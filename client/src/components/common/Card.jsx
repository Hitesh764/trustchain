export default function Card({ className = "", children, ...props }) {
  return (
    <div className={`glass-card p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}
