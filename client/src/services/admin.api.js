import api from "./api";

export const listManufacturers = (params) => api.get("/admin/manufacturers", { params }).then((r) => r.data);
export const updateManufacturerStatus = (id, status) =>
  api.put(`/admin/manufacturers/${id}/status`, { status }).then((r) => r.data);

export const listReports = (params) => api.get("/admin/reports", { params }).then((r) => r.data);
export const updateReportStatus = (id, status) =>
  api.put(`/admin/reports/${id}/status`, { status }).then((r) => r.data);
