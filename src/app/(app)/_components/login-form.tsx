"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight } from "lucide-react";

export function EmberLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-10 w-full max-w-sm space-y-8 px-8">
      {/* Brand mark for mobile */}
      <div className="text-center lg:text-left">
        <h1 className="mb-2 text-2xl font-semibold text-[#F7F7F8]">
          Welcome back
        </h1>
        <p className="text-sm text-[#9494A0]">
          Sign in to access your project board.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#9494A0]">
            Email address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-3 text-sm text-[#F7F7F8] placeholder:text-[#55555F] transition-colors focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
            placeholder="you@example.com"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-[#9494A0]">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-3 text-sm text-[#F7F7F8] placeholder:text-[#55555F] transition-colors focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
            placeholder="Enter your password"
          />
        </div>

        {error && (
          <div className="rounded-lg bg-[rgba(212,69,58,0.08)] px-3 py-2">
            <p className="text-xs text-[#D4453A]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition-all disabled:opacity-50"
          style={{
            background: loading
              ? "#252529"
              : "linear-gradient(135deg, #D4453A, #C03830)",
          }}
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in...
            </>
          ) : (
            <>
              Sign in
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </>
          )}
        </button>
      </form>

      {/* Subtle brand reference */}
      <p className="text-center text-xs text-[#55555F]">
        plan
        <span
          style={{
            background: "linear-gradient(135deg, #D4453A, #F0A868)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          .
        </span>
        socket
        <span
          style={{
            background: "linear-gradient(135deg, #D4453A, #F0A868)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          .
        </span>
        agency
      </p>
    </div>
  );
}
