"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      router.push("/board");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-surface-0">
      {/* Radial glow behind card */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand header */}
        <div className="mb-8 text-center">
          <h1 className="font-mono text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            socket.agency
          </h1>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Plan
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border border-border bg-surface-1 p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 border-border bg-surface-0 text-foreground placeholder:text-muted-foreground/50 focus-visible:ring-brand/50"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-border bg-surface-0 text-foreground focus-visible:ring-brand/50"
                required
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-brand">{error}</p>
            )}
            <Button
              type="submit"
              className="h-11 w-full bg-brand font-medium text-white transition-all hover:bg-brand/90 hover:shadow-[0_0_20px_rgba(201,42,42,0.3)]"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50">
          Powered by Socket Agency
        </p>
      </div>
    </div>
  );
}
