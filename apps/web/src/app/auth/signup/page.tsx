"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function OrquestraIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="16" y="16" width="8" height="8" fill="white" />
      <rect x="16" y="4" width="8" height="8" fill="white" opacity="0.6" />
      <rect x="28" y="16" width="8" height="8" fill="white" opacity="0.6" />
      <rect x="16" y="28" width="8" height="8" fill="white" opacity="0.6" />
      <rect x="4" y="16" width="8" height="8" fill="white" opacity="0.6" />
      <line x1="20" y1="12" x2="20" y2="16" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="24" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="20" y1="24" x2="20" y2="28" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="12" y1="20" x2="16" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    institution_id: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 12) {
      toast.error("Password must be at least 12 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, role: "owner" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Registration failed" }));
        throw new Error(err.detail || "Registration failed");
      }
      toast.success("Account created! Please sign in.");
      router.push("/auth/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const update = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inputStyle = {
    background: "#0f0f12",
    border: "1px solid #25252b",
    color: "#f4f4f5",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: "#0f0f12" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <OrquestraIcon />
          <span className="mt-3 text-xl font-semibold" style={{ color: "#f4f4f5" }}>
            Orquestra
          </span>
          <span className="text-sm mt-1" style={{ color: "#8a8a94" }}>
            Create your account
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-lg p-6 border"
          style={{ background: "#141418", borderColor: "#25252b" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: "#a1a1aa" }}>
                Full Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={update("name")}
                required
                placeholder="Jane Smith"
                className="w-full rounded px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#25252b")}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: "#a1a1aa" }}>
                Institution ID
              </label>
              <input
                type="text"
                value={form.institution_id}
                onChange={update("institution_id")}
                required
                placeholder="inst_your_org_id"
                className="w-full rounded px-3 py-2.5 text-sm outline-none font-mono transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#25252b")}
              />
              <p className="text-xs mt-1" style={{ color: "#52525b" }}>
                Your institution's unique identifier
              </p>
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: "#a1a1aa" }}>
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={update("email")}
                required
                placeholder="you@institution.edu"
                className="w-full rounded px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#25252b")}
              />
            </div>
            <div>
              <label className="block text-sm mb-1.5 font-medium" style={{ color: "#a1a1aa" }}>
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={update("password")}
                required
                minLength={12}
                placeholder="Min 12 characters"
                className="w-full rounded px-3 py-2.5 text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.target.style.borderColor = "#25252b")}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded py-2.5 text-sm font-semibold transition-all disabled:opacity-60"
              style={{ background: "#3b82f6", color: "#fff" }}
            >
              {loading ? "Creating account…" : "Create Account"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t text-center text-sm" style={{ borderColor: "#25252b", color: "#8a8a94" }}>
            Already have an account?{" "}
            <Link href="/auth/login" style={{ color: "#3b82f6" }}>
              Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#52525b" }}>
          <Link href="/" style={{ color: "#52525b" }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
