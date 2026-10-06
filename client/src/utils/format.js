export function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function truncateAddress(address) {
  if (!address) return "—";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function truncateHash(hash, lead = 8, tail = 6) {
  if (!hash) return "—";
  return `${hash.slice(0, lead)}…${hash.slice(-tail)}`;
}
