import { useState } from "react";
import Modal from "./Modal";
import Button from "./Button";
import { downloadQr, assetUrl } from "../../services/product.api";
import { useToast } from "../../hooks/useToast";

export default function QrDownloadModal({ open, onClose, product }) {
  const [downloading, setDownloading] = useState(null);
  const { showToast } = useToast();

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const blob = await downloadQr(product.productId, format);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${product.name}-${product.batchNo}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showToast(err.response?.data?.message || "Could not download QR", "error");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Download QR">
      <div className="flex flex-col items-center gap-4">
        {product?.qrCode ? (
          <img
            src={assetUrl(product.qrCode)}
            alt={`QR code for ${product.name}`}
            className="h-40 w-40 rounded-xl border border-slate-200 bg-white p-2 dark:border-white/10"
          />
        ) : (
          <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15 text-center text-xs text-slate-400">
            No QR available
          </div>
        )}
        <div className="text-center">
          <p className="font-medium">{product?.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Batch #{product?.batchNo}</p>
        </div>
        <div className="flex gap-2">
          {["png", "svg", "pdf"].map((format) => (
            <Button
              key={format}
              variant="secondary"
              loading={downloading === format}
              onClick={() => handleDownload(format)}
            >
              {format.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
