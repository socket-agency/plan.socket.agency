"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Plus,
  Trash2,
  Shield,
  User,
  X,
  KeyRound,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";

interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  role: "owner" | "client";
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ApiKeysPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/api-keys");
      if (res.ok) setKeys(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Revoke API key "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/auth/api-keys?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) setKeys((prev) => prev.filter((k) => k.id !== id));
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
          Only the agency owner can manage API keys.
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
            <h1 className="text-2xl font-semibold text-[#F7F7F8]">API Keys</h1>
            <p className="mt-1 text-sm text-[#9494A0]">
              Manage keys for MCP and API access.
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
            Create Key
          </button>
        </div>

        {/* Key list */}
        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#131316] py-12">
            <KeyRound size={32} className="mb-3 text-[#55555F]" />
            <p className="text-sm text-[#9494A0]">No API keys yet.</p>
            <p className="mt-1 text-xs text-[#55555F]">
              Create one to connect Claude Code or other tools.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => (
              <div
                key={k.id}
                className="flex items-center gap-4 rounded-lg border border-white/[0.06] bg-[#131316] px-5 py-4"
              >
                {/* Icon */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(212,69,58,0.12)] text-[#D4453A]">
                  <KeyRound size={16} />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-[#F7F7F8]">
                      {k.name}
                    </p>
                    <span className="flex items-center gap-1 rounded-full bg-[rgba(212,69,58,0.08)] px-2 py-0.5 text-[10px] font-medium text-[#D4453A]">
                      {k.role === "owner" ? (
                        <Shield size={10} />
                      ) : (
                        <User size={10} />
                      )}
                      {k.role === "owner" ? "Owner" : "Client"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[#55555F]">
                    <code className="font-mono">{k.keyPrefix}...</code>
                    <span>·</span>
                    <span>
                      {k.lastUsedAt
                        ? `Used ${formatRelativeDate(k.lastUsedAt)}`
                        : "Never used"}
                    </span>
                    <span>·</span>
                    <span>Created {formatRelativeDate(k.createdAt)}</span>
                    {k.expiresAt && (
                      <>
                        <span>·</span>
                        <span>
                          Expires{" "}
                          {new Date(k.expiresAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(k.id, k.name)}
                  className="shrink-0 rounded-md p-1.5 text-[#55555F] transition-colors hover:bg-[rgba(212,69,58,0.08)] hover:text-[#D4453A]"
                  title="Revoke key"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Create modal */}
        {showCreate && (
          <CreateKeyModal
            onClose={() => setShowCreate(false)}
            onCreated={() => {
              fetchKeys();
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreateKeyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<"owner" | "client">("owner");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create key");
      }
      const data = await res.json();
      setCreatedKey(data.key);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={createdKey ? undefined : onClose}
      />

      <div className="relative w-full max-w-md rounded-xl border border-white/[0.06] bg-[#131316] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#F7F7F8]">
            {createdKey ? "API Key Created" : "Create API Key"}
          </h2>
          {!createdKey && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[#55555F] hover:text-[#9494A0]"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {createdKey ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg bg-[rgba(240,168,104,0.08)] px-3 py-2">
              <AlertTriangle
                size={14}
                className="mt-0.5 shrink-0 text-[#F0A868]"
              />
              <p className="text-xs text-[#F0A868]">
                Copy this key now. It won't be shown again.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <code className="flex-1 overflow-hidden truncate rounded-lg border border-white/[0.06] bg-[#252529] px-3 py-2.5 font-mono text-xs text-[#F7F7F8]">
                {createdKey}
              </code>
              <button
                onClick={handleCopy}
                className="shrink-0 rounded-lg border border-white/[0.06] bg-[#252529] p-2.5 text-[#9494A0] transition-colors hover:text-[#F7F7F8]"
                title="Copy to clipboard"
              >
                {copied ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} />
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #D4453A, #C03830)",
              }}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. claude-code"
                className="w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-2.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30"
              />
            </Field>

            <Field label="Role">
              <div className="flex gap-2">
                {(["owner", "client"] as const).map((r) => (
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
                    {r === "owner" ? <Shield size={14} /> : <User size={14} />}
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
                "Create Key"
              )}
            </button>
          </form>
        )}
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
