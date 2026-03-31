"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { ChatDrawer } from "@/components/chat/chat-drawer";
import type { UserRole } from "@/db/schema";

interface AppShellProps {
  userName: string;
  userRole: UserRole;
  children: React.ReactNode;
}

export function AppShell({ userName, userRole, children }: AppShellProps) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar
        userName={userName}
        userRole={userRole}
        onChatToggle={() => setChatOpen((prev) => !prev)}
      />
      <main className="flex-1 overflow-auto">{children}</main>
      <ChatDrawer
        open={chatOpen}
        onOpenChange={setChatOpen}
        userRole={userRole}
      />
    </div>
  );
}
