import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import PublicLayout from "./components/layout/PublicLayout";
import DashboardShell from "./components/layout/DashboardShell";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import LoadingSkeleton from "./components/common/LoadingSkeleton";

// Route-level code splitting: html5-qrcode alone accounts for most of the
// ~600KB single-bundle warning `vite build` gives without this -- it has no
// business being downloaded by someone just visiting the landing page.
const Landing = lazy(() => import("./pages/customer/Landing"));
const About = lazy(() => import("./pages/customer/About"));
const Scanner = lazy(() => import("./pages/customer/Scanner"));
const VerifyResult = lazy(() => import("./pages/customer/VerifyResult"));
const NotFound = lazy(() => import("./pages/customer/NotFound"));

const Login = lazy(() => import("./pages/manufacturer/Login"));
const Register = lazy(() => import("./pages/manufacturer/Register"));
const Dashboard = lazy(() => import("./pages/manufacturer/Dashboard"));
const AddProduct = lazy(() => import("./pages/manufacturer/AddProduct"));
const ProductList = lazy(() => import("./pages/manufacturer/ProductList"));
const Analytics = lazy(() => import("./pages/manufacturer/Analytics"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const ManufacturerList = lazy(() => import("./pages/admin/ManufacturerList"));
const AllProducts = lazy(() => import("./pages/admin/AllProducts"));
const CounterfeitReports = lazy(() => import("./pages/admin/CounterfeitReports"));

const MANUFACTURER_NAV = [
  { to: "/dashboard", label: "Dashboard", end: true },
  { to: "/dashboard/add-product", label: "Add Product" },
  { to: "/dashboard/products", label: "Products" },
  { to: "/dashboard/analytics", label: "Analytics" },
];

const ADMIN_NAV = [
  { to: "/admin/dashboard", label: "Overview", end: true },
  { to: "/admin/manufacturers", label: "Manufacturers" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/reports", label: "Counterfeit Reports" },
];

function RouteFallback() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <LoadingSkeleton rows={4} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/about" element={<About />} />
          <Route path="/scan" element={<Scanner />} />
          <Route path="/verify/:productId" element={<VerifyResult />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route element={<ProtectedRoute allowedRole="manufacturer" />}>
          <Route element={<DashboardShell title="Manufacturer Dashboard" navItems={MANUFACTURER_NAV} />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/add-product" element={<AddProduct />} />
            <Route path="/dashboard/products" element={<ProductList />} />
            <Route path="/dashboard/analytics" element={<Analytics />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute allowedRole="admin" />}>
          <Route element={<DashboardShell title="Admin Panel" navItems={ADMIN_NAV} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/manufacturers" element={<ManufacturerList />} />
            <Route path="/admin/products" element={<AllProducts />} />
            <Route path="/admin/reports" element={<CounterfeitReports />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
