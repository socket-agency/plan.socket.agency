"use client";

import { useState } from "react";
import { Board } from "@/components/kanban/board";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import type { Task, TaskStatus, UserRole } from "@/db/schema";

interface BoardClientProps {
  tasks: Task[];
  isOwner: boolean;
  userRole: UserRole;
}

export function BoardClient({ tasks, isOwner, userRole }: BoardClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("backlog");

  function handleAddTask(status: TaskStatus) {
    setDefaultStatus(isOwner ? status : "backlog");
    setCreateDialogOpen(true);
  }

  return (
    <>
      <Board
        initialTasks={tasks}
        isOwner={isOwner}
        onAddTask={handleAddTask}
      />
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultStatus={defaultStatus}
        userRole={userRole}
      />
    </>
  );
}
