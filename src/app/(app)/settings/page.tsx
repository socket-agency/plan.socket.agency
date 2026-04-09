"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { CurrentUser } from "@/lib/types";

export default function EmberSettingsPage() {
  const { user, loading, updateUser } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4453A] border-t-transparent" />
          <span className="text-sm text-[#9494A0]">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-2xl font-semibold text-[#F7F7F8]">Settings</h1>
        <p className="mb-8 text-sm text-[#9494A0]">
          Manage your account and application preferences.
        </p>

        <Tabs defaultValue="profile">
          <TabsList variant="line" className="mb-6">
            <TabsTrigger
              value="profile"
              className="px-4 py-2 text-sm text-[#9494A0] data-active:text-[#F7F7F8]"
            >
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="px-4 py-2 text-sm text-[#9494A0] data-active:text-[#F7F7F8]"
            >
              Notifications
            </TabsTrigger>
            <TabsTrigger
              value="application"
              className="px-4 py-2 text-sm text-[#9494A0] data-active:text-[#F7F7F8]"
            >
              Application
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="space-y-6">
              {user && (
                <>
                  <ProfileForm user={user} updateUser={updateUser} />
                  <ChangePasswordForm />
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notifications">
            <div className="space-y-6">
              {user && <NotificationSettings user={user} updateUser={updateUser} />}
            </div>
          </TabsContent>

          <TabsContent value="application">
            <div className="space-y-6">
              <SettingsCard title="Application Details">
                <SettingsField label="Version" value="0.1.0" />
                <SettingsField label="Design" value="EMBER" badge />
                <SettingsField label="Theme" value="Dark" />
              </SettingsCard>

              <SettingsCard title="Features">
                <SettingsField label="AI Chat" value="Enabled" />
                <SettingsField label="Drag & Drop" value="Enabled" />
                <SettingsField label="Comments" value="Enabled" />
              </SettingsCard>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

const inputClassName =
  "w-full rounded-lg border border-white/[0.06] bg-[#252529] px-4 py-2.5 text-sm text-[#F7F7F8] placeholder:text-[#55555F] transition-colors focus:border-[#D4453A] focus:outline-none focus:ring-1 focus:ring-[#D4453A]/30";

function ProfileForm({
  user,
  updateUser,
}: {
  user: CurrentUser;
  updateUser: (u: CurrentUser) => void;
}) {
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const dirty = name !== user.name || email !== user.email;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update profile");
        return;
      }

      updateUser(data.user);
      setSuccess("Profile updated");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Personal Information">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9494A0]">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
            placeholder="Your name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9494A0]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#9494A0]">Role</span>
          <span className="rounded-full bg-[rgba(212,69,58,0.12)] px-3 py-0.5 font-mono text-xs text-[#D4453A]">
            {user.role === "owner" ? "Owner" : "Client"}
          </span>
        </div>

        {error && (
          <div className="rounded-lg bg-[rgba(212,69,58,0.08)] px-3 py-2">
            <p className="text-xs text-[#D4453A]">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-[rgba(74,222,128,0.08)] px-3 py-2">
            <p className="text-xs text-green-400">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!dirty || saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
          style={{
            background:
              !dirty || saving
                ? "#252529"
                : "linear-gradient(135deg, #D4453A, #C03830)",
          }}
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Saving...
            </>
          ) : (
            "Save changes"
          )}
        </button>
      </form>
    </SettingsCard>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length >= 6 &&
    confirmPassword.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to change password");
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password changed");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to change password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Change Password">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9494A0]">
            Current password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClassName}
            placeholder="Enter current password"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9494A0]">
            New password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClassName}
            placeholder="At least 6 characters"
            minLength={6}
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-[#9494A0]">
            Confirm new password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={inputClassName}
            placeholder="Repeat new password"
            required
          />
        </div>

        {error && (
          <div className="rounded-lg bg-[rgba(212,69,58,0.08)] px-3 py-2">
            <p className="text-xs text-[#D4453A]">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-[rgba(74,222,128,0.08)] px-3 py-2">
            <p className="text-xs text-green-400">{success}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-all disabled:opacity-50"
          style={{
            background:
              !canSubmit || saving
                ? "#252529"
                : "linear-gradient(135deg, #D4453A, #C03830)",
          }}
        >
          {saving ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Changing...
            </>
          ) : (
            "Change password"
          )}
        </button>
      </form>
    </SettingsCard>
  );
}

// --- Notification Settings ---

const DIGEST_PRESETS = [
  { label: "Daily", hours: 24 },
  { label: "Every 3 days", hours: 72 },
  { label: "Weekly", hours: 168 },
] as const;

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        backgroundColor: checked ? "#D4453A" : "#3f3f46",
      }}
    >
      <span
        className="pointer-events-none block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform"
        style={{
          transform: checked ? "translateX(18px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

function localHourToUtc(localHour: number): number {
  const now = new Date();
  now.setHours(localHour, 0, 0, 0);
  return now.getUTCHours();
}

function utcHourToLocal(utcHour: number): number {
  const now = new Date();
  const utcDate = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), utcHour, 0, 0),
  );
  return utcDate.getHours();
}

function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 || 12;
  return `${h}:00 ${period}`;
}

function NotificationSettings({
  user,
  updateUser,
}: {
  user: CurrentUser;
  updateUser: (u: CurrentUser) => void;
}) {
  const prefs = user.notificationPrefs;
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function updatePref(
    key: string,
    patch: Record<string, unknown>,
  ) {
    setError("");
    setSaving(key);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update");
        return;
      }
      updateUser({ ...user, notificationPrefs: data.notificationPrefs });
    } catch {
      setError("Failed to update preferences");
    } finally {
      setSaving(null);
    }
  }

  const digestEnabled = prefs.digestIntervalHours != null;
  const localHour = utcHourToLocal(prefs.digestHourUtc);

  return (
    <>
      <SettingsCard title="Instant Notifications">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-[#F7F7F8]">Email notifications</p>
            <p className="text-xs text-[#71717a]">
              Get notified immediately when tasks are updated, comments are
              added, or files are attached.
            </p>
          </div>
          <Toggle
            checked={prefs.emailEnabled}
            onChange={(v) => updatePref("emailEnabled", { emailEnabled: v })}
            disabled={saving === "emailEnabled"}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Activity Digest">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-[#F7F7F8]">Digest emails</p>
              <p className="text-xs text-[#71717a]">
                Receive a periodic summary of all project activity.
              </p>
            </div>
            <Toggle
              checked={digestEnabled}
              onChange={(v) =>
                updatePref("digestIntervalHours", {
                  digestIntervalHours: v ? 24 : null,
                })
              }
              disabled={saving === "digestIntervalHours"}
            />
          </div>

          {digestEnabled && (
            <>
              {/* Frequency presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9494A0]">
                  Frequency
                </label>
                <div className="flex gap-2">
                  {DIGEST_PRESETS.map((preset) => {
                    const active =
                      prefs.digestIntervalHours === preset.hours;
                    return (
                      <button
                        key={preset.hours}
                        onClick={() =>
                          updatePref("digestIntervalHours", {
                            digestIntervalHours: preset.hours,
                          })
                        }
                        disabled={saving === "digestIntervalHours"}
                        className="rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          borderColor: active
                            ? "#D4453A"
                            : "rgba(255,255,255,0.06)",
                          backgroundColor: active
                            ? "rgba(212,69,58,0.12)"
                            : "transparent",
                          color: active ? "#D4453A" : "#9494A0",
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
                {prefs.digestIntervalHours != null &&
                  !DIGEST_PRESETS.some(
                    (p) => p.hours === prefs.digestIntervalHours,
                  ) && (
                    <p className="text-xs text-[#9494A0]">
                      Custom: every {prefs.digestIntervalHours} hours
                    </p>
                  )}
              </div>

              {/* Delivery hour */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#9494A0]">
                  Delivery time
                </label>
                <select
                  value={localHour}
                  onChange={(e) =>
                    updatePref("digestHourUtc", {
                      digestHourUtc: localHourToUtc(Number(e.target.value)),
                    })
                  }
                  disabled={saving === "digestHourUtc"}
                  className={inputClassName}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {formatHour(i)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[#55555F]">
                  Shown in your local timezone (
                  {Intl.DateTimeFormat().resolvedOptions().timeZone})
                </p>
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      {error && (
        <div className="rounded-lg bg-[rgba(212,69,58,0.08)] px-3 py-2">
          <p className="text-xs text-[#D4453A]">{error}</p>
        </div>
      )}
    </>
  );
}

function SettingsCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-[#131316] p-6">
      <h3 className="mb-4 text-sm font-medium text-[#F7F7F8]">{title}</h3>
      {children}
    </div>
  );
}

function SettingsField({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#9494A0]">{label}</span>
      {badge ? (
        <span className="rounded-full bg-[rgba(212,69,58,0.12)] px-3 py-0.5 font-mono text-xs text-[#D4453A]">
          {value}
        </span>
      ) : (
        <span className="text-sm text-[#F7F7F8]">{value}</span>
      )}
    </div>
  );
}
