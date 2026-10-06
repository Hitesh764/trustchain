import api from "./api";

export const createProduct = (payload) => api.post("/products", payload).then((r) => r.data);
export const listProducts = (params) => api.get("/products", { params }).then((r) => r.data);
export const getProduct = (productId) => api.get(`/products/${productId}`).then((r) => r.data);
export const transferOwnership = (payload) => api.put("/products/ownership", payload).then((r) => r.data);
export const recallProduct = (productId) => api.put("/products/recall", { productId }).then((r) => r.data);

export const getManufacturerStats = () => api.get("/products/stats").then((r) => r.data);
export const getRecentScans = () => api.get("/products/recent-scans").then((r) => r.data);

export const downloadQr = (productId, format) =>
  api.get(`/products/${productId}/qr`, { params: { format }, responseType: "blob" }).then((r) => r.data);

// Static files (uploaded QR PNGs) are served from the API's origin, not
// under /api -- VITE_API_BASE_URL is e.g. http://localhost:5000/api.
export const assetUrl = (path) => {
  if (!path) return null;
  const origin = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");
  return `${origin}${path}`;
};
