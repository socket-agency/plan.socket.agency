"use client";

import { useState } from "react";
import { Board } from "@/components/kanban/board";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import type { Task, TaskStatus } from "@/db/schema";

interface BoardClientProps {
  tasks: Task[];
  isOwner: boolean;
}

export function BoardClient({ tasks, isOwner }: BoardClientProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState<TaskStatus>("backlog");

  function handleAddTask(status: TaskStatus) {
    setDefaultStatus(status);
    setCreateDialogOpen(true);
  }

  return (
    <>
      <Board
        initialTasks={tasks}
        isOwner={isOwner}
        onAddTask={isOwner ? handleAddTask : undefined}
      />
      {isOwner && (
        <CreateTaskDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          defaultStatus={defaultStatus}
        />
      )}
    </>
  );
}
