import Card from "../../components/common/Card";

const STACK = ["React", "Vite", "Tailwind CSS", "Node.js", "Express", "MongoDB", "Solidity", "Sepolia", "ethers.js"];

export default function About() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-bold">About TrustChain</h1>
      <p className="mt-2 text-slate-500 dark:text-slate-400">
        A final year project demonstrating blockchain-based product authentication.
      </p>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">The problem</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Counterfeit food, medicine, cosmetics, and fashion items routinely copy the original
            packaging exactly. Customers have no independent way to check whether what they're
            holding matches what the manufacturer actually produced.
          </p>
        </Card>
        <Card>
          <h2 className="font-semibold">Our approach</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Every product gets one digital identity, written once to Ethereum. A QR code on the
            packaging links to that identity — no login, no app install, just a scan and an
            instant, tamper-evident answer.
          </p>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="font-semibold">Scope note</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          This project demonstrates how blockchain provides immutable, transparent product
          records — it does not attempt to solve every real-world anti-counterfeit problem. A QR
          code sticker can still be physically copied; that's a known, accepted limitation of any
          QR-based system, blockchain-backed or not.
        </p>
      </Card>

      <div className="mt-10">
        <h2 className="text-center font-semibold text-slate-500 dark:text-slate-400">Built with</h2>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {STACK.map((s) => (
            <span key={s} className="badge-neutral">
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
