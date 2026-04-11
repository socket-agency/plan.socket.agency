"use client";

import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Settings,
  LogOut,
  KeyRound,
  BarChart3,
} from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutGrid, label: "Board", exact: true },
  { href: "/dashboard", icon: BarChart3, label: "Dashboard", ownerOnly: true },
  { href: "/users", icon: Users, label: "Users", ownerOnly: true },
  { href: "/api-keys", icon: KeyRound, label: "API Keys", ownerOnly: true },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function EmberNav({
  userName,
  userRole,
  progressDone,
  progressTotal,
}: {
  userName: string;
  userRole: string;
  progressDone: number;
  progressTotal: number;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const visibleItems = navItems.filter(
    (item) => !("ownerOnly" in item && item.ownerOnly) || userRole === "owner",
  );

  const initials = userName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const progressPct =
    progressTotal > 0 ? Math.round((progressDone / progressTotal) * 100) : 0;

  return (
    <nav className="bg-noise relative flex h-full w-[240px] shrink-0 flex-col border-r border-white/[0.06] bg-[#131316]">
      <div className="relative z-10 flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="text-lg font-semibold tracking-tight text-[#F7F7F8]">
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
          </span>
        </div>

        {/* Navigation links */}
        <div className="flex flex-1 flex-col gap-1 px-3 pt-2">
          {visibleItems.map((item) => {
            const active = isActive(item.href, item.exact);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-[rgba(212,69,58,0.12)] text-[#D4453A] font-medium"
                    : "text-[#9494A0] hover:bg-white/[0.04] hover:text-[#F7F7F8]"
                }`}
              >
                <item.icon size={18} strokeWidth={1.5} />
                {item.label}
              </a>
            );
          })}
        </div>

        {/* Progress bar */}
        <div className="px-5 pb-3">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-medium text-[#9494A0]">Progress</span>
            {progressTotal > 0 ? (
              <span className="tabular-nums text-[#55555F]">
                {progressDone}/{progressTotal}{" "}
                <span className="text-[#9494A0]">{progressPct}%</span>
              </span>
            ) : (
              <span className="text-[#55555F]">No tasks yet</span>
            )}
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#252529]">
            <div
              className="h-1 rounded-full transition-all duration-500"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(135deg, #D4453A, #F0A868)",
              }}
            />
          </div>
        </div>

        {/* User section at bottom */}
        <div className="border-t border-white/[0.06] px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            {/* Avatar */}
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{
                background: "linear-gradient(135deg, #D4453A, #F0A868)",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-[#F7F7F8]">
                {userName}
              </p>
              <p className="truncate text-xs text-[#55555F]">
                {userRole === "owner" ? "Owner" : "Client"}
              </p>
            </div>
            <button
              onClick={() =>
                fetch("/api/auth/logout", { method: "POST" }).then(() =>
                  window.location.assign("/login")
                )
              }
              className="shrink-0 rounded-md p-1.5 text-[#55555F] transition-colors hover:bg-white/[0.04] hover:text-[#9494A0]"
              title="Sign out"
            >
              <LogOut size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
