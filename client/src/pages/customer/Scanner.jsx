import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import { Camera } from "lucide-react";

const READER_ELEMENT_ID = "qr-reader";

export default function Scanner() {
  const [productId, setProductId] = useState("");
  const [cameraState, setCameraState] = useState("idle"); // idle | starting | scanning | error
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef(null);
  const navigatedRef = useRef(false);
  const navigate = useNavigate();

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      if (scanner.isScanning) await scanner.stop();
      scanner.clear();
    } catch {
      // already stopped/cleared -- nothing to do
    }
  };

  useEffect(() => stopScanner, []);

  const goToProduct = (decodedText) => {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    stopScanner();
    navigate(`/verify/${decodedText.trim()}`);
  };

  const startCamera = async () => {
    setCameraState("starting");
    setCameraError("");
    try {
      const scanner = new Html5Qrcode(READER_ELEMENT_ID);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => goToProduct(decodedText),
        undefined // per-frame decode failures are expected constantly; ignore them
      );
      setCameraState("scanning");
    } catch (err) {
      setCameraState("error");
      setCameraError(
        err?.message?.includes("Permission")
          ? "Camera access was denied. You can still enter the Product ID manually below."
          : "Could not start the camera. You can still enter the Product ID manually below."
      );
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (productId.trim()) navigate(`/verify/${productId.trim()}`);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-16">
      <h1 className="text-2xl font-bold">Verify a Product</h1>
      <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
        Scan the QR code on the packaging, or enter the Product ID manually below.
      </p>

      <Card className="mt-8 w-full">
        <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 dark:border-white/15">
          {/* Kept in normal flow (never display:none) once mounted -- html5-qrcode
              sizes its internal video/canvas off this container's rendered
              dimensions, and a hidden parent means those come back zero. The
              idle/error placeholder is layered on top instead, via absolute
              positioning, so it can hide without touching this element's display. */}
          <div id={READER_ELEMENT_ID} style={{ minHeight: 280 }} />

          {cameraState !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white text-center text-sm text-slate-400 dark:bg-slate-900">
              <Camera className="h-8 w-8" strokeWidth={1.5} aria-hidden />
              {cameraState === "error" ? (
                <p className="max-w-xs px-4 text-danger-600 dark:text-danger-300">{cameraError}</p>
              ) : (
                <Button variant="secondary" loading={cameraState === "starting"} onClick={startCamera}>
                  Start Camera
                </Button>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3">
          <Input
            label="Can't scan? Enter the Product ID"
            placeholder="e.g. 8f2c1a90-4b3e-4d21-9c77-..."
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
          />
          <Button type="submit" variant="primary">
            Verify
          </Button>
        </form>
      </Card>
    </div>
  );
}
