"use client";

import {
  taskAssignees,
  taskPriorities,
  type TaskAssignee,
  type TaskPriority,
} from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, X } from "lucide-react";

const priorityColors: Record<TaskPriority, string> = {
  low: "#55555F",
  medium: "#9494A0",
  high: "#D4453A",
  urgent: "#FF4444",
};

const assigneeColors: Record<TaskAssignee, string> = {
  agency: "#D4453A",
  client: "#F0A868",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface BoardFiltersProps {
  assignees: TaskAssignee[];
  onAssigneesChange: (value: TaskAssignee[]) => void;
  reviewers: TaskAssignee[];
  onReviewersChange: (value: TaskAssignee[]) => void;
  priorities: TaskPriority[];
  onPrioritiesChange: (value: TaskPriority[]) => void;
}

function toggle<T>(arr: T[], value: T): T[] {
  return arr.includes(value)
    ? arr.filter((v) => v !== value)
    : [...arr, value];
}

export function BoardFilters({
  assignees,
  onAssigneesChange,
  reviewers,
  onReviewersChange,
  priorities,
  onPrioritiesChange,
}: BoardFiltersProps) {
  const hasFilters = assignees.length > 0 || reviewers.length > 0 || priorities.length > 0;

  return (
    <div className="flex items-center gap-2 border-b border-white/[0.06] px-6 py-2">
      {/* Assignee filter */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[#131316] px-3 py-1.5 text-xs text-[#9494A0] transition-colors hover:border-white/[0.12] hover:text-[#F7F7F8]">
          Assignee
          {assignees.length > 0 && (
            <span className="rounded-full bg-[#D4453A]/20 px-1.5 text-[10px] font-medium text-[#D4453A]">
              {assignees.length}
            </span>
          )}
          <ChevronDown size={12} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Assignee</DropdownMenuLabel>
            {taskAssignees.map((a) => (
              <DropdownMenuCheckboxItem
                key={a}
                checked={assignees.includes(a)}
                onCheckedChange={() => onAssigneesChange(toggle(assignees, a))}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: assigneeColors[a] }}
                />
                {capitalize(a)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reviewer filter */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[#131316] px-3 py-1.5 text-xs text-[#9494A0] transition-colors hover:border-white/[0.12] hover:text-[#F7F7F8]">
          Reviewer
          {reviewers.length > 0 && (
            <span className="rounded-full bg-[#D4453A]/20 px-1.5 text-[10px] font-medium text-[#D4453A]">
              {reviewers.length}
            </span>
          )}
          <ChevronDown size={12} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Reviewer</DropdownMenuLabel>
            {taskAssignees.map((a) => (
              <DropdownMenuCheckboxItem
                key={a}
                checked={reviewers.includes(a)}
                onCheckedChange={() => onReviewersChange(toggle(reviewers, a))}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: assigneeColors[a] }}
                />
                {capitalize(a)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Priority filter */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-[#131316] px-3 py-1.5 text-xs text-[#9494A0] transition-colors hover:border-white/[0.12] hover:text-[#F7F7F8]">
          Priority
          {priorities.length > 0 && (
            <span className="rounded-full bg-[#D4453A]/20 px-1.5 text-[10px] font-medium text-[#D4453A]">
              {priorities.length}
            </span>
          )}
          <ChevronDown size={12} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Priority</DropdownMenuLabel>
            {taskPriorities.map((p) => (
              <DropdownMenuCheckboxItem
                key={p}
                checked={priorities.includes(p)}
                onCheckedChange={() => onPrioritiesChange(toggle(priorities, p))}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: priorityColors[p] }}
                />
                {capitalize(p)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Clear all */}
      {hasFilters && (
        <button
          onClick={() => {
            onAssigneesChange([]);
            onReviewersChange([]);
            onPrioritiesChange([]);
          }}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[#9494A0] transition-colors hover:text-[#F7F7F8]"
        >
          <X size={12} />
          Clear
        </button>
      )}
    </div>
  );
}
