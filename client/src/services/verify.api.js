import api from "./api";

export const verifyProduct = (productId) => api.get(`/verify/${productId}`).then((r) => r.data);
