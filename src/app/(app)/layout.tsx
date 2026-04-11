import { getCurrentUser } from "@/lib/auth";
import { getBoardSummary } from "@/lib/board-summary";
import { redirect } from "next/navigation";
import { EmberNav } from "./_components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, summary] = await Promise.all([
    getCurrentUser(),
    getBoardSummary(),
  ]);
  if (!user) redirect("/login");

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={
        {
          "--background": "#0A0A0C",
          "--foreground": "#F7F7F8",
          "--card": "#131316",
          "--card-foreground": "#F7F7F8",
          "--popover": "#1C1C21",
          "--popover-foreground": "#F7F7F8",
          "--primary": "#D4453A",
          "--primary-foreground": "#FFFFFF",
          "--secondary": "#1C1C21",
          "--secondary-foreground": "#E0E0E0",
          "--muted": "#1C1C21",
          "--muted-foreground": "#9494A0",
          "--accent": "#252529",
          "--accent-foreground": "#F7F7F8",
          "--border": "rgba(255,255,255,0.06)",
          "--input": "rgba(255,255,255,0.08)",
          "--ring": "#D4453A",
          "--radius": "0.5rem",
        } as React.CSSProperties
      }
    >
      <EmberNav
        userName={user.name}
        userRole={user.role}
        progressDone={summary.done}
        progressTotal={summary.total}
      />
      <main className="flex-1 overflow-hidden bg-[#0A0A0C]">{children}</main>
    </div>
  );
}
