import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Card from "../../components/common/Card";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import Logo from "../../components/common/Logo";
import { loginAdmin } from "../../services/auth.api";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

export default function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await loginAdmin(form);
      login("admin", data.token, data.admin);
      navigate("/admin/dashboard");
    } catch (err) {
      showToast(err.response?.data?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-6 py-20">
      <Link to="/" className="mb-8 text-xl font-bold">
        <Logo suffix=" — Admin" />
      </Link>
      <Card className="w-full">
        <h1 className="text-lg font-semibold">Admin Login</h1>
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
    </div>
  );
}
