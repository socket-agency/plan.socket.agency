"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, ChevronDown, Shield, User } from "lucide-react";

const roles = [
  { value: "owner", label: "Agency Owner", icon: Shield },
  { value: "client", label: "Client", icon: User },
] as const;

export function EmberLoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<"owner" | "client">("owner");
  const [roleOpen, setRoleOpen] = useState(false);
  const roleRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleRef.current && !roleRef.current.contains(e.target as Node)) {
        setRoleOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        {/* Role selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-[#9494A0]">
            I am
          </label>
          <div ref={roleRef} className="relative">
            <button
              type="button"
              onClick={() => setRoleOpen(!roleOpen)}
              className="flex w-full items-center justify-between rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-3 text-sm text-[#F7F7F8] transition-colors hover:border-white/[0.1] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
            >
              <span className="flex items-center gap-2.5">
                {(() => {
                  const selected = roles.find((r) => r.value === role)!;
                  return (
                    <>
                      <selected.icon size={16} className="text-[#9494A0]" />
                      {selected.label}
                    </>
                  );
                })()}
              </span>
              <ChevronDown
                size={16}
                className={`text-[#55555F] transition-transform ${roleOpen ? "rotate-180" : ""}`}
              />
            </button>
            {roleOpen && (
              <div className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-lg border border-white/[0.06] bg-[#1C1C21] shadow-xl shadow-black/40">
                {roles.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => {
                      setRole(r.value);
                      setRoleOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 px-4 py-3 text-sm transition-colors ${
                      role === r.value
                        ? "bg-[rgba(212,69,58,0.08)] text-[#D4453A]"
                        : "text-[#9494A0] hover:bg-white/[0.04] hover:text-[#F7F7F8]"
                    }`}
                  >
                    <r.icon size={16} />
                    {r.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

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
