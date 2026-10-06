import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Logo from "../../components/common/Logo";
import { loginManufacturer } from "../../services/auth.api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginManufacturer(form);
      login("manufacturer", data.token, data.manufacturer);
      showToast(`Welcome back, ${data.manufacturer.companyName}`, "success");
      navigate("/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-20">
      <Link to="/" className="mb-8 text-xl font-bold">
        <Logo />
      </Link>
      <Card className="w-full">
        <h1 className="text-lg font-semibold">Manufacturer Login</h1>
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Password"
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <Button type="submit" loading={loading}>
            Login
          </Button>
        </form>
      </Card>
      <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">
        New manufacturer?{" "}
        <Link to="/register" className="font-medium text-brand-600 dark:text-brand-400">
          Register →
        </Link>
      </p>
    </div>
  );
}
