"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, Loader2, Shield } from "lucide-react";

function OrquestraLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="16" y="16" width="8" height="8" fill="white" />
      <rect x="16" y="4" width="8" height="8" fill="white" opacity="0.7" />
      <rect x="28" y="16" width="8" height="8" fill="white" opacity="0.7" />
      <rect x="16" y="28" width="8" height="8" fill="white" opacity="0.7" />
      <rect x="4" y="16" width="8" height="8" fill="white" opacity="0.7" />
      <line x1="20" y1="12" x2="20" y2="16" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="24" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="20" y1="24" x2="20" y2="28" stroke="white" strokeWidth="1.5" opacity="0.4" />
      <line x1="12" y1="20" x2="16" y2="20" stroke="white" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next") || "/console";
  // Prevent open redirects — only allow redirects to internal console paths
  const next = rawNext.startsWith("/console") ? rawNext : "/console";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Email address is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // trim + lowercase email; never log password
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Use a generic message to avoid leaking whether the email exists
        const msg =
          res.status === 401
            ? "Invalid email or password."
            : data?.detail || "Something went wrong. Please try again.";
        setError(msg);
        return;
      }

      // Successful — redirect to console (or the requested path)
      router.replace(next);
      router.refresh();
    } catch {
      setError("Unable to reach the server. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "#0f0f12" }}
    >
      {/* Back to home */}
      <div className="w-full max-w-[420px] mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm transition-colors hover:text-[#a1a1aa]"
          style={{ color: "#71717a" }}
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[420px] rounded-xl"
        style={{ background: "#141418", border: "1px solid #25252b" }}
      >
        {/* Card header */}
        <div
          className="px-8 pt-8 pb-6 text-center"
          style={{ borderBottom: "1px solid #1e1e24" }}
        >
          <div className="flex items-center justify-center gap-3 mb-5">
            <OrquestraLogo size={34} />
            <div className="text-left">
              <p className="text-sm font-semibold leading-none" style={{ color: "#f4f4f5" }}>
                Orquestra
              </p>
              <p
                className="text-[10px] tracking-widest uppercase mt-1"
                style={{ color: "#71717a" }}
              >
                Infrastructure
              </p>
            </div>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: "#f4f4f5", fontSize: "1.2rem" }}>
            Sign in to your account
          </h1>
          <p className="text-sm mt-1.5" style={{ color: "#71717a" }}>
            Access the institutional runtime console
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="px-8 py-7 space-y-5">
          {/* Error banner */}
          {error && (
            <div
              className="flex items-start gap-3 rounded-lg px-4 py-3 text-sm"
              style={{
                background: "#160a0a",
                border: "1px solid #3b1a1a",
                color: "#f87171",
              }}
            >
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Email */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-medium"
              style={{ color: "#a1a1aa" }}
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@institution.edu"
              className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all duration-150 disabled:opacity-50"
              style={{
                background: "#0f0f12",
                border: "1px solid #25252b",
                color: "#f4f4f5",
                caretColor: "#3b82f6",
                fontSize: "0.875rem",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#25252b")}
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-xs font-medium"
                style={{ color: "#a1a1aa" }}
              >
                Password
              </label>
              {/* Placeholder for "Forgot password" — can wire up later */}
              <span className="text-xs" style={{ color: "#52525b" }}>
                Forgot password?
              </span>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••••••"
                className="w-full rounded-lg px-3.5 py-2.5 pr-11 text-sm outline-none transition-all duration-150 disabled:opacity-50"
                style={{
                  background: "#0f0f12",
                  border: "1px solid #25252b",
                  color: "#f4f4f5",
                  caretColor: "#3b82f6",
                  fontSize: "0.875rem",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#3b82f6")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#25252b")}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 transition-colors"
                style={{ color: "#71717a" }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full rounded-lg py-2.5 text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70"
            style={{
              background: "#3b82f6",
              color: "#fff",
              fontSize: "0.875rem",
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = "#2563eb";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#3b82f6";
            }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Footer */}
        <div
          className="px-8 pb-7 text-center text-sm"
          style={{ color: "#71717a" }}
        >
          Don&apos;t have an account?{" "}
          <Link
            href="/contact"
            className="font-medium transition-colors hover:text-[#f4f4f5]"
            style={{ color: "#a1a1aa" }}
          >
            Request access →
          </Link>
        </div>
      </div>

      {/* Security notice */}
      <div
        className="mt-6 flex items-center gap-2 text-xs max-w-[420px] text-center"
        style={{ color: "#52525b" }}
      >
        <Shield size={12} className="shrink-0" />
        <span>
          Protected by CSRF tokens and end-to-end transport encryption.
          Credentials are never stored in plaintext.
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
