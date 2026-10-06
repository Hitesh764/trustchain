// Jest manual mock. Real QR generation was independently verified in Phase 6
// (including decoding the output to confirm it contains only productId) --
// re-running the real qrcode/pdfkit file-writing on every test invocation
// added no coverage, only real disk writes into server/uploads/qrcodes/ and
// several seconds of wall-clock time per test (this repo lives under
// OneDrive, which intercepts new file writes for sync).

async function generateAndStoreQr(productId) {
  return `/uploads/qrcodes/${productId}.png`;
}

async function getQrPngBuffer(productId) {
  return Buffer.from(`fake-png-for-${productId}`);
}

async function getQrSvgString(productId) {
  return `<svg data-product-id="${productId}"></svg>`;
}

async function getQrPdfBuffer(productId) {
  return Buffer.from(`fake-pdf-for-${productId}`);
}

module.exports = { generateAndStoreQr, getQrPngBuffer, getQrSvgString, getQrPdfBuffer };
