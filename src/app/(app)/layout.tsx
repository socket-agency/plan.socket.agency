import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <TooltipProvider>
      <AppShell userName={user.name} userRole={user.role}>
        {children}
      </AppShell>
    </TooltipProvider>
  );
}
