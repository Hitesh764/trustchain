import { useEffect, useState } from "react";
import { CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { useParams, Link } from "react-router-dom";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Input from "../../components/common/Input";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import { verifyProduct } from "../../services/verify.api";
import { submitReport } from "../../services/report.api";
import { useToast } from "../../hooks/useToast";
import { formatDate, truncateAddress, truncateHash } from "../../utils/format";

function ReportForm({ productId }) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ description: "", userLocation: "", contactEmail: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("description", form.description);
      if (form.userLocation) formData.append("userLocation", form.userLocation);
      if (form.contactEmail) formData.append("contactEmail", form.contactEmail);

      await submitReport(formData);
      setSubmitted(true);
      showToast("Report submitted — thank you for flagging this.", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not submit report", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <p className="flex items-center gap-1.5 text-sm text-success-600 dark:text-success-400">
        <CircleCheck className="h-4 w-4 shrink-0" /> Report submitted. Thank you.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <Input
        label="Your location (optional)"
        value={form.userLocation}
        onChange={(e) => setForm({ ...form, userLocation: e.target.value })}
      />
      <Input
        label="Contact email (optional)"
        type="email"
        value={form.contactEmail}
        onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
      />
      <div className="sm:col-span-2">
        <label className="field-label">What looked wrong?</label>
        <textarea
          required
          rows={3}
          className="field-input"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" variant="danger" loading={submitting}>
          Submit Report
        </Button>
      </div>
    </form>
  );
}

export default function VerifyResult() {
  const { productId } = useParams();
  const [state, setState] = useState({ loading: true, error: null, result: null });
  const [reportOpen, setReportOpen] = useState(false);

  const { recalled, expired } = state.result ?? {};
  const flagged = Boolean(recalled || expired);
  const headline =
    recalled && expired
      ? "Genuine Product — Recalled & Expired"
      : recalled
      ? "Genuine Product — Recalled"
      : expired
      ? "Genuine Product — Expired"
      : "Genuine Product";

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, error: null, result: null });

    verifyProduct(productId)
      .then((res) => {
        if (!cancelled) setState({ loading: false, error: null, result: res.data });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            error: err.response?.data?.message || err.message,
            result: null,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [productId]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <p className="mb-4 text-center font-mono text-xs text-slate-400">/verify/{productId}</p>

      {state.loading && <LoadingSkeleton rows={4} />}

      {!state.loading && state.error && (
        <Card className="text-center">
          <p className="font-semibold text-danger-600 dark:text-danger-300">Something went wrong</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{state.error}</p>
        </Card>
      )}

      {!state.loading && state.result && !state.result.verified && (
        <div className="flex flex-col gap-6">
          <Card className="border-danger-300/60 text-center dark:border-danger-500/20">
            <CircleX className="mx-auto h-8 w-8 text-danger-500" strokeWidth={1.75} />
            <h1 className="mt-2 text-xl font-bold text-danger-600 dark:text-danger-300">
              Counterfeit Product
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              This Product ID has no matching record on TrustChain. It may be fake, tampered, or an
              invalid QR code.
            </p>
          </Card>
          <Card>
            <h2 className="font-semibold">Report this product</h2>
            <p className="mt-1 mb-4 text-sm text-slate-500 dark:text-slate-400">
              Help us track counterfeits by sharing what you found.
            </p>
            <ReportForm productId={productId} />
          </Card>
        </div>
      )}

      {!state.loading && state.result && state.result.verified && (
        <div className="flex flex-col gap-6">
          <Card
            className={`text-center ${
              flagged
                ? "border-danger-300/60 dark:border-danger-500/20"
                : "border-success-300/60 dark:border-success-500/20"
            }`}
          >
            {flagged ? (
              <TriangleAlert className="mx-auto h-8 w-8 text-danger-500" strokeWidth={1.75} />
            ) : (
              <CircleCheck className="mx-auto h-8 w-8 text-success-500" strokeWidth={1.75} />
            )}
            <h1
              className={`mt-2 text-xl font-bold ${
                flagged
                  ? "text-danger-600 dark:text-danger-300"
                  : "text-success-600 dark:text-success-400"
              }`}
            >
              {headline}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Verified against the TrustChain smart contract.
            </p>
            {state.result.expired && (
              <p className="mt-3 text-sm font-medium text-danger-600 dark:text-danger-300">
                This product expired on {formatDate(state.result.product.expiryDate)}. Do not use it.
              </p>
            )}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="mb-3 font-semibold">Product Details</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Name" value={state.result.product.name} />
                <Row label="Brand" value={state.result.product.brand} />
                <Row label="Batch No." value={state.result.product.batchNo} />
                <Row label="Manufactured" value={formatDate(state.result.product.manufacturingDate)} />
                <Row
                  label="Expires"
                  value={
                    state.result.expired
                      ? `${formatDate(state.result.product.expiryDate)} (expired)`
                      : formatDate(state.result.product.expiryDate)
                  }
                  danger={state.result.expired}
                />
                <Row label="Factory" value={state.result.product.factory} />
              </dl>
            </Card>
            <Card>
              <h2 className="mb-3 font-semibold">Blockchain Proof</h2>
              <dl className="space-y-2 text-sm">
                <Row label="Transaction" value={truncateHash(state.result.product.transactionHash)} mono />
                <Row label="Current Owner" value={truncateAddress(state.result.product.currentOwner)} mono />
                <Row
                  label="Ownership Transfers"
                  value={`${Math.max((state.result.ownershipHistory?.length ?? 1) - 1, 0)}`}
                />
              </dl>
            </Card>
          </div>

          <Card className="text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Something look off despite the checkmark?</p>
            <button
              onClick={() => setReportOpen((v) => !v)}
              className="mt-1 text-sm font-medium text-brand-600 underline dark:text-brand-400"
            >
              Report this product
            </button>
            {reportOpen && (
              <div className="mt-5 text-left">
                <ReportForm productId={productId} />
              </div>
            )}
          </Card>
        </div>
      )}

      <p className="mt-8 text-center">
        <Link to="/scan" className="text-sm text-slate-500 hover:text-brand-600 dark:text-slate-400">
          ← Scan another product
        </Link>
      </p>
    </div>
  );
}

function Row({ label, value, mono, danger }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd
        className={`font-medium ${mono ? "font-mono text-xs" : ""} ${
          danger ? "text-danger-600 dark:text-danger-300" : ""
        }`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
