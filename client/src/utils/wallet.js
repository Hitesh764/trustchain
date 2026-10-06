// Thin wrapper around window.ethereum (MetaMask). Kept separate from any
// component so the "no wallet installed" / "user rejected" error messages
// live in one place.

export function isWalletAvailable() {
  return typeof window !== "undefined" && Boolean(window.ethereum);
}

export async function requestWalletAddress() {
  if (!isWalletAvailable()) {
    throw new Error("MetaMask not detected. Install the browser extension to connect a wallet.");
  }
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
  if (!accounts?.[0]) throw new Error("No wallet account was returned.");
  return accounts[0];
}

export async function signMessage(address, message) {
  return window.ethereum.request({
    method: "personal_sign",
    params: [message, address],
  });
}
