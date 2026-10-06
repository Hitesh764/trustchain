import { Link2 } from "lucide-react";

// "TrustChain" + a chain-link mark, used everywhere the brand name appears
// (navbar, dashboard sidebar, auth pages). Self-contained as an inline-flex
// span so it drops into a heading, a <Link>, or a <p> without the parent
// needing its own flex/gap classes -- and the icon sizes off the surrounding
// font-size (1em), so it matches text-lg, text-xl, text-sm, etc. automatically.
export default function Logo({ className = "", suffix = "" }) {
  return (
    <span className={`inline-flex items-center gap-1.5 align-middle ${className}`}>
      <Link2 aria-hidden style={{ width: "1em", height: "1em" }} strokeWidth={2.25} />
      TrustChain{suffix}
    </span>
  );
}
