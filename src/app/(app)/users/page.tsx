"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Trash2, Shield, User, X } from "lucide-react";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "owner" | "client";
  createdAt: string;
}

export default function UsersPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) setUsers(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (res.ok) setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4453A] border-t-transparent" />
          <span className="text-sm text-[#9494A0]">Loading...</span>
        </div>
      </div>
    );
  }

  if (currentUser?.role !== "owner") {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-sm text-[#9494A0]">
          Only the agency owner can manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#F7F7F8]">Users</h1>
            <p className="mt-1 text-sm text-[#9494A0]">
              Manage who can access this project.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #D4453A, #C03830)",
            }}
          >
            <Plus size={16} />
            Add User
          </button>
        </div>

        {/* User list */}
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-[#131316] px-5 py-4"
            >
              {/* Avatar */}
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white ${
                  u.role === "owner"
                    ? ""
                    : "bg-[rgba(240,168,104,0.2)]"
                }`}
                style={
                  u.role === "owner"
                    ? {
                        background:
                          "linear-gradient(135deg, #D4453A, #F0A868)",
                      }
                    : { color: "#F0A868" }
                }
              >
                {u.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-[#F7F7F8]">
                    {u.name}
                  </p>
                  <span className="flex items-center gap-1 rounded-full bg-[rgba(212,69,58,0.08)] px-2 py-0.5 text-[10px] font-medium text-[#D4453A]">
                    {u.role === "owner" ? (
                      <Shield size={10} />
                    ) : (
                      <User size={10} />
                    )}
                    {u.role === "owner" ? "Owner" : "Client"}
                  </span>
                </div>
                <p className="truncate text-xs text-[#55555F]">{u.email}</p>
              </div>

              {/* Delete (not for self) */}
              {u.id !== currentUser?.id && (
                <button
                  onClick={() => handleDelete(u.id, u.name)}
                  className="shrink-0 rounded-md p-1.5 text-[#55555F] transition-colors hover:bg-[rgba(212,69,58,0.08)] hover:text-[#D4453A]"
                  title="Delete user"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Create user modal */}
        {showCreate && (
          <CreateUserModal
            onClose={() => setShowCreate(false)}
            onCreated={(user) => {
              setUsers((prev) => [...prev, user]);
              setShowCreate(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (user: UserRecord) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"owner" | "client">("client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create user");
      }
      onCreated(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-white/[0.06] bg-[#131316] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F7F7F8]">
            Add New User
          </h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[#55555F] hover:text-[#9494A0]"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Jane Smith"
              className="w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-2.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-2.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
            />
          </Field>

          <Field label="Password">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Min 6 characters"
              className="w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-2.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
            />
          </Field>

          <Field label="Role">
            <div className="flex gap-2">
              {(["client", "owner"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                    role === r
                      ? "border-[#D4453A]/30 bg-[rgba(212,69,58,0.08)] text-[#D4453A]"
                      : "border-white/[0.06] bg-[#252529] text-[#9494A0] hover:border-white/[0.1] hover:text-[#F7F7F8]"
                  }`}
                >
                  {r === "owner" ? (
                    <Shield size={14} />
                  ) : (
                    <User size={14} />
                  )}
                  {r === "owner" ? "Owner" : "Client"}
                </button>
              ))}
            </div>
          </Field>

          {error && (
            <div className="rounded-lg bg-[rgba(212,69,58,0.08)] px-3 py-2">
              <p className="text-xs text-[#D4453A]">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
            style={{
              background: loading
                ? "#252529"
                : "linear-gradient(135deg, #D4453A, #C03830)",
            }}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating...
              </>
            ) : (
              "Create User"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#9494A0]">{label}</label>
      {children}
    </div>
  );
}
