const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");

const QR_DIR = path.join(__dirname, "..", "uploads", "qrcodes");

// The QR encodes ONLY productId -- never brand/dates/anything else. Those
// live on-chain and in Mongo, looked up server-side after a scan decodes
// this ID (see docs/ARCHITECTURE.md's "QR Data" rule).
function qrFilePath(productId) {
  return path.join(QR_DIR, `${productId}.png`);
}

// Called once at product registration. Writes the canonical PNG to disk and
// returns the public path stored on Product.qrCode. Re-creates QR_DIR if it's
// missing (recursive mkdir is cheap and idempotent) rather than assuming the
// one-time directory creation at module load never gets wiped out from under
// a running process (e.g. a cleaned/reset uploads volume).
async function generateAndStoreQr(productId) {
  fs.mkdirSync(QR_DIR, { recursive: true });
  await QRCode.toFile(qrFilePath(productId), productId, { width: 512, margin: 2 });
  return `/uploads/qrcodes/${productId}.png`;
}

async function getQrPngBuffer(productId) {
  const filePath = qrFilePath(productId);
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
  return QRCode.toBuffer(productId, { width: 512, margin: 2 });
}

async function getQrSvgString(productId) {
  return QRCode.toString(productId, { type: "svg", width: 512, margin: 2 });
}

// A one-page PDF: the QR plus a human-readable caption, for print-and-stick
// use on physical packaging.
async function getQrPdfBuffer(productId, { name, batchNo } = {}) {
  const pngBuffer = await getQrPngBuffer(productId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [300, 360], margin: 20 });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.image(pngBuffer, 20, 20, { width: 260, height: 260 });
    doc.fontSize(11).text(name || "", 20, 290, { width: 260, align: "center" });
    if (batchNo) doc.fontSize(9).fillColor("#666").text(`Batch #${batchNo}`, 20, 308, { width: 260, align: "center" });
    doc.fontSize(7).fillColor("#999").text(productId, 20, 335, { width: 260, align: "center" });

    doc.end();
  });
}

module.exports = { generateAndStoreQr, getQrPngBuffer, getQrSvgString, getQrPdfBuffer };
