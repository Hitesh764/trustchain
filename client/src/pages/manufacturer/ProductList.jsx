import { useEffect, useState } from "react";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Select from "../../components/common/Select";
import Button from "../../components/common/Button";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import QrDownloadModal from "../../components/common/QrDownloadModal";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { listProducts, transferOwnership, recallProduct } from "../../services/product.api";
import { useToast } from "../../hooks/useToast";
import { Search } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "recalled", label: "Recalled" },
];

export default function ProductList() {
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [qrProduct, setQrProduct] = useState(null);
  const [transferTarget, setTransferTarget] = useState(null);
  const [newOwnerWallet, setNewOwnerWallet] = useState("");
  const [busyId, setBusyId] = useState(null);
  const { showToast } = useToast();

  const fetchProducts = () => {
    listProducts({ search: search || undefined, status: status || undefined }).then((res) =>
      setProducts(res.data.products)
    );
  };

  useEffect(() => {
    const timeout = setTimeout(fetchProducts, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status]);

  const handleRecall = async (product) => {
    if (!window.confirm(`Recall "${product.name}"? This can't be undone.`)) return;
    setBusyId(product._id);
    try {
      await recallProduct(product.productId);
      showToast("Product recalled", "success");
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not recall product", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setBusyId(transferTarget._id);
    try {
      await transferOwnership({ productId: transferTarget.productId, newOwnerWallet });
      showToast("Ownership transferred", "success");
      setTransferTarget(null);
      setNewOwnerWallet("");
      fetchProducts();
    } catch (err) {
      showToast(err.response?.data?.message || "Could not transfer ownership", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Search"
          placeholder="Product name or batch no."
          className="flex-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select label="Status" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
      </Card>

      {!products ? (
        <LoadingSkeleton rows={5} />
      ) : products.length === 0 ? (
        <EmptyState icon={Search} title="No products found" description="Try a different search or filter." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Batch</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Scans</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {products.map((p) => (
                <tr key={p._id}>
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{p.batchNo}</td>
                  <td className="py-2.5">
                    <Badge status={p.status} />
                  </td>
                  <td className="py-2.5 tabular-nums">{p.scanCount}</td>
                  <td className="py-2.5">
                    <div className="flex justify-end gap-1.5">
                      <Button variant="ghost" onClick={() => setQrProduct(p)}>
                        QR
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={p.status === "recalled"}
                        onClick={() => setTransferTarget(p)}
                      >
                        Transfer
                      </Button>
                      <Button
                        variant="ghost"
                        className="text-danger-600 dark:text-danger-300"
                        disabled={p.status === "recalled" || busyId === p._id}
                        onClick={() => handleRecall(p)}
                      >
                        Recall
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <QrDownloadModal open={Boolean(qrProduct)} onClose={() => setQrProduct(null)} product={qrProduct} />

      <Modal open={Boolean(transferTarget)} onClose={() => setTransferTarget(null)} title="Transfer Ownership">
        <form onSubmit={handleTransfer} className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Transferring <strong>{transferTarget?.name}</strong> to a new wallet address.
          </p>
          <Input
            label="New Owner Wallet"
            required
            placeholder="0x..."
            pattern="^0x[a-fA-F0-9]{40}$"
            value={newOwnerWallet}
            onChange={(e) => setNewOwnerWallet(e.target.value)}
          />
          <Button type="submit" loading={busyId === transferTarget?._id}>
            Confirm Transfer
          </Button>
        </form>
      </Modal>
    </div>
  );
}
