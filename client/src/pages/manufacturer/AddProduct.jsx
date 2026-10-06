import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import { createProduct, assetUrl } from "../../services/product.api";
import { useToast } from "../../hooks/useToast";
import { CircleCheck } from "lucide-react";

const CATEGORIES = [
  { value: "food", label: "Food" },
  { value: "medicine", label: "Medicine" },
  { value: "cosmetics", label: "Cosmetics" },
  { value: "fashion", label: "Fashion" },
  { value: "fmcg", label: "FMCG" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  name: "",
  brand: "",
  category: "food",
  batchNo: "",
  manufacturingDate: "",
  expiryDate: "",
  factory: "",
  description: "",
};

export default function AddProduct() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await createProduct(form);
      setRegistered(data.product);
      showToast("Product minted on-chain", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Could not register product", "error");
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <Card className="text-center">
        <CircleCheck className="mx-auto h-8 w-8 text-success-500" strokeWidth={1.75} />
        <h1 className="mt-2 font-semibold">Product registered</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {registered.name} · Batch #{registered.batchNo}
        </p>
        {registered.qrCode ? (
          <img
            src={assetUrl(registered.qrCode)}
            alt={`QR code for ${registered.name}`}
            className="mx-auto mt-5 h-32 w-32 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10"
          />
        ) : (
          <div className="mx-auto mt-5 flex h-32 w-32 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15 text-center text-xs text-slate-400">
            No QR available
          </div>
        )}
        <p className="mt-4 font-mono text-xs text-slate-400">tx {registered.transactionHash.slice(0, 18)}…</p>
        <div className="mt-5 flex justify-center gap-3">
          <Button variant="secondary" onClick={() => { setRegistered(null); setForm(EMPTY_FORM); }}>
            Register Another
          </Button>
          <Button onClick={() => navigate("/dashboard/products")}>View Products</Button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="mb-5 font-semibold">Add Product</h1>
      <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
        <Input label="Product Name" required value={form.name} onChange={update("name")} />
        <Input label="Brand" required value={form.brand} onChange={update("brand")} />
        <Select label="Category" options={CATEGORIES} value={form.category} onChange={update("category")} />
        <Input label="Batch Number" required value={form.batchNo} onChange={update("batchNo")} />
        <Input
          label="Manufacturing Date"
          type="date"
          required
          value={form.manufacturingDate}
          onChange={update("manufacturingDate")}
        />
        <Input label="Expiry Date" type="date" required value={form.expiryDate} onChange={update("expiryDate")} />
        <Input
          label="Factory / Plant Location"
          required
          className="sm:col-span-2"
          value={form.factory}
          onChange={update("factory")}
        />
        <div className="sm:col-span-2">
          <label className="field-label">Description</label>
          <textarea rows={3} className="field-input" value={form.description} onChange={update("description")} />
        </div>
        <Button type="submit" loading={loading} className="sm:col-span-2">
          {loading ? "Minting on Sepolia…" : "Submit & Mint on Blockchain"}
        </Button>
      </form>
    </Card>
  );
}
