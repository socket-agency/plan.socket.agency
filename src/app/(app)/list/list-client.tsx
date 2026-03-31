"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/task-table/data-table";
import { columns } from "@/components/task-table/columns";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Task, UserRole } from "@/db/schema";

interface ListClientProps {
  tasks: Task[];
  isOwner: boolean;
  userRole: UserRole;
}

export function ListClient({ tasks, isOwner, userRole }: ListClientProps) {
  const router = useRouter();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">Tasks</h2>
        <div className="flex items-center gap-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {tasks.length} tasks
          </p>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="gap-2 bg-brand text-white hover:bg-brand/90"
            size="sm"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <DataTable
          columns={columns}
          data={tasks}
          onRowClick={(task) => router.push(`/tasks/${task.id}`)}
        />
      </div>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        userRole={userRole}
      />
    </div>
  );
}
