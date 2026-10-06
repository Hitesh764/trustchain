import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("trustchain-auth");
  const token = raw ? JSON.parse(raw)?.token : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
