import api from "./api";

export const getWalletNonce = (walletAddress) =>
  api.get("/auth/wallet-nonce", { params: { walletAddress } }).then((r) => r.data);
export const registerManufacturer = (payload) => api.post("/auth/register", payload).then((r) => r.data);
export const loginManufacturer = (payload) => api.post("/auth/login", payload).then((r) => r.data);
export const loginAdmin = (payload) => api.post("/auth/admin/login", payload).then((r) => r.data);
