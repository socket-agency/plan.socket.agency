"use client";

import { useAuth } from "@/hooks/use-auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function EmberSettingsPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <div
            className="h-4 w-4 animate-spin rounded-full border-2 border-[#D4453A] border-t-transparent"
          />
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
              value="application"
              className="px-4 py-2 text-sm text-[#9494A0] data-active:text-[#F7F7F8]"
            >
              Application
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <div className="space-y-6">
              <SettingsCard title="Personal Information">
                <SettingsField label="Name" value={user?.name ?? "---"} />
                <SettingsField label="Email" value={user?.email ?? "---"} />
                <SettingsField
                  label="Role"
                  value={user?.role === "owner" ? "Owner" : "Client"}
                  badge
                />
              </SettingsCard>
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
      <div className="space-y-4">{children}</div>
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
