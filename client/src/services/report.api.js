import api from "./api";

export const submitReport = (formData) =>
  api
    .post("/reports", formData, { headers: { "Content-Type": "multipart/form-data" } })
    .then((r) => r.data);
