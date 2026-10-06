import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { registerManufacturer, getWalletNonce } from "../../services/auth.api";
import { requestWalletAddress, signMessage } from "../../utils/wallet";
import { truncateAddress } from "../../utils/format";
import { useToast } from "../../hooks/useToast";
import Logo from "../../components/common/Logo";
import { CircleCheck } from "lucide-react";

const EMPTY_FORM = {
  name: "",
  companyName: "",
  gstNumber: "",
  email: "",
  password: "",
  phone: "",
};

// wallet: { address, signature } | null -- only set once the wallet has
// actually signed the nonce challenge, not just typed an address in.
export default function Register() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleConnectWallet = async () => {
    setConnecting(true);
    setWalletError("");
    try {
      const address = await requestWalletAddress();
      const { data } = await getWalletNonce(address);
      const signature = await signMessage(address, data.message);
      setWallet({ address, signature });
    } catch (err) {
      setWalletError(err?.message || "Could not connect wallet");
    } finally {
      setConnecting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return;
    setLoading(true);
    try {
      await registerManufacturer({ ...form, walletAddress: wallet.address, signature: wallet.signature });
      setSubmitted(true);
    } catch (err) {
      showToast(err.response?.data?.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-24 text-center">
        <Card>
          <CircleCheck className="mx-auto h-8 w-8 text-success-500" strokeWidth={1.75} />
          <h1 className="mt-3 font-semibold">Registration submitted</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Your account is pending admin approval. You'll be able to log in once it's approved.
          </p>
          <Button className="mt-5" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-16">
      <Link to="/" className="mb-8 text-xl font-bold">
        <Logo />
      </Link>
      <Card className="w-full">
        <h1 className="text-lg font-semibold">Register Manufacturer</h1>
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input label="Contact Name" required value={form.name} onChange={update("name")} />
          <Input label="Company Name" required value={form.companyName} onChange={update("companyName")} />
          <Input label="GST Number" required value={form.gstNumber} onChange={update("gstNumber")} />
          <Input label="Phone" value={form.phone} onChange={update("phone")} />
          <Input
            label="Email"
            type="email"
            required
            className="sm:col-span-2"
            value={form.email}
            onChange={update("email")}
          />
          <Input
            label="Password"
            type="password"
            required
            minLength={8}
            className="sm:col-span-2"
            value={form.password}
            onChange={update("password")}
          />

          <div className="sm:col-span-2">
            <label className="field-label">Wallet</label>
            {wallet ? (
              <div className="flex items-center gap-2 rounded-xl border border-success-300 bg-success-50 px-3.5 py-2.5 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
                <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2} /> Verified {truncateAddress(wallet.address)}
              </div>
            ) : (
              <Button type="button" variant="secondary" loading={connecting} onClick={handleConnectWallet}>
                Connect Wallet (MetaMask)
              </Button>
            )}
            {walletError && (
              <p className="mt-1.5 text-xs font-medium text-danger-600 dark:text-danger-300">{walletError}</p>
            )}
            <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
              Signing a message proves you control this wallet it's not just typed into a form.
            </p>
          </div>

          <Button type="submit" loading={loading} disabled={!wallet} className="sm:col-span-2">
            Submit for Approval
          </Button>
        </form>
      </Card>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        Already registered?{" "}
        <Link to="/login" className="font-medium text-brand-600 dark:text-brand-400">
          Login →
        </Link>
      </p>
    </div>
  );
}
