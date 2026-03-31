"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  List,
  Settings,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/db/schema";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userName: string;
  userRole: UserRole;
  onChatToggle: () => void;
}

const navItems = [
  { href: "/board", label: "Board", icon: LayoutDashboard },
  { href: "/list", label: "List", icon: List },
];

export function Sidebar({ userName, userRole, onChatToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-surface-0">
      {/* Brand */}
      <div className="px-4 py-5">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
          socket.agency
        </p>
        <h1 className="mt-0.5 text-lg font-semibold tracking-tight">Plan</h1>
      </div>

      <div className="mx-3 h-px bg-border" />

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-2 pt-3">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              pathname === item.href
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <item.icon className={cn(
              "h-4 w-4 transition-colors",
              pathname === item.href ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
            )} />
            {item.label}
          </Link>
        ))}

        {userRole === "owner" && (
          <Link
            href="/settings"
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150",
              pathname === "/settings"
                ? "bg-brand/10 text-brand"
                : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
            )}
          >
            <Settings className={cn(
              "h-4 w-4 transition-colors",
              pathname === "/settings" ? "text-brand" : "text-muted-foreground group-hover:text-foreground"
            )} />
            Settings
          </Link>
        )}
      </nav>

      {/* AI Chat button */}
      <div className="px-2 pb-1">
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          onClick={onChatToggle}
        >
          <MessageSquare className="h-4 w-4" />
          <span className="text-sm font-medium">AI Chat</span>
        </Button>
      </div>

      <div className="mx-3 h-px bg-border" />

      {/* User info */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{userName}</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {userRole}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
        </Button>
      </div>
    </aside>
  );
}
