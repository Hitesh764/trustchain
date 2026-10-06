import { useEffect, useState } from "react";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Badge from "../../components/common/Badge";
import LoadingSkeleton from "../../components/common/LoadingSkeleton";
import EmptyState from "../../components/common/EmptyState";
import { listProducts } from "../../services/product.api";
import { formatDate } from "../../utils/format";
import { Package } from "lucide-react";

export default function AllProducts() {
  const [products, setProducts] = useState(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => {
      listProducts({ search: search || undefined }).then((res) => setProducts(res.data.products));
    }, 250);
    return () => clearTimeout(timeout);
  }, [search]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <Input
          label="Search"
          placeholder="Product name or batch no."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {!products ? (
        <LoadingSkeleton rows={5} />
      ) : products.length === 0 ? (
        <EmptyState icon={Package} title="No products found" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <tr>
                <th className="pb-2">Name</th>
                <th className="pb-2">Brand</th>
                <th className="pb-2">Batch</th>
                <th className="pb-2">Registered</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {products.map((p) => (
                <tr key={p._id}>
                  <td className="py-2.5 font-medium">{p.name}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{p.brand}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{p.batchNo}</td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400">{formatDate(p.createdAt)}</td>
                  <td className="py-2.5">
                    <Badge status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
