"use client";

import { usePathname } from "next/navigation";
import { LayoutGrid, Settings, LogOut } from "lucide-react";

const navItems = [
  { href: "/", icon: LayoutGrid, label: "Board", exact: true },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export function EmberNav({
  userName,
  userRole,
}: {
  userName: string;
  userRole: string;
}) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const initials = userName
    .split(" ")
    .map((n) => n.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);

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
          {navItems.map((item) => {
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
