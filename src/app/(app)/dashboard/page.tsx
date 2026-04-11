import { getCurrentUser } from "@/lib/auth";
import { getBoardSummary } from "@/lib/board-summary";
import { taskStatuses, taskPriorities, taskAssignees } from "@/db/schema";
import type { TaskStatus, TaskPriority } from "@/db/schema";
import type { StalenessLevel } from "@/lib/board-summary";
import {
  statusLabels,
  statusColors,
  priorityLabels,
  priorityColors,
  assigneeLabels,
  assigneeColors,
} from "@/lib/task-config";
import { redirect } from "next/navigation";

const stalenessConfig: Record<
  StalenessLevel,
  { label: string; color: string }
> = {
  aging: { label: "Aging", color: "#F0A868" },
  stale: { label: "Stale", color: "#D4453A" },
  abandoned: { label: "Abandoned", color: "#FF4444" },
};

function StalenessScoreLabel({ score }: { score: number }) {
  if (score === 0) return <span className="text-[#34D399]">Pristine</span>;
  if (score < 20) return <span className="text-[#34D399]">Healthy</span>;
  if (score <= 50) return <span className="text-[#F0A868]">Needs Attention</span>;
  return <span className="text-[#FF4444]">Critical</span>;
}

function stalenessScoreColor(score: number): string {
  if (score < 20) return "#34D399";
  if (score <= 50) return "#F0A868";
  return "#FF4444";
}

function relativeDate(date: Date): string {
  const days = Math.floor(
    (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function HorizontalBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[#252529]">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "owner") redirect("/");

  const summary = await getBoardSummary();

  const inProgress =
    (summary.byStatus["in_progress"] || 0) +
    (summary.byStatus["in_review"] || 0);

  const staleByTier = {
    aging: summary.staleTasks.filter((t) => t.stalenessLevel === "aging").length,
    stale: summary.staleTasks.filter((t) => t.stalenessLevel === "stale").length,
    abandoned: summary.staleTasks.filter((t) => t.stalenessLevel === "abandoned").length,
  };

  return (
    <div className="h-full overflow-y-auto p-8">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-1 text-2xl font-semibold text-[#F7F7F8]">
          Dashboard
        </h1>
        <p className="mb-8 text-sm text-[#9494A0]">
          Project overview and task analytics.
        </p>

        {/* Summary cards — row 1 */}
        <div className="mb-4 grid grid-cols-4 gap-4">
          <SummaryCard label="Total Tasks" value={summary.total} />
          <SummaryCard
            label="Completed"
            value={summary.done}
            sub={`${summary.completionRate}%`}
            subColor="#34D399"
          />
          <SummaryCard label="In Progress" value={inProgress} />
          <SummaryCard
            label="Overdue"
            value={summary.overdue}
            valueColor={summary.overdue > 0 ? "#FF4444" : undefined}
          />
        </div>

        {/* Summary cards — row 2: staleness */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#55555F]">
              Staleness Score
            </p>
            <div className="flex items-baseline gap-3">
              <span
                className="text-3xl font-semibold tabular-nums"
                style={{ color: stalenessScoreColor(summary.stalenessScore) }}
              >
                {summary.stalenessScore}
              </span>
              <StalenessScoreLabel score={summary.stalenessScore} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#252529]">
              <div
                className="h-2 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(summary.stalenessScore, 100)}%`,
                  backgroundColor: stalenessScoreColor(summary.stalenessScore),
                }}
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#55555F]">
              Stale Tasks
            </p>
            <span className="text-3xl font-semibold tabular-nums text-[#F7F7F8]">
              {summary.staleTasks.length}
            </span>
            {summary.staleTasks.length > 0 && (
              <div className="mt-2 flex gap-4 text-xs">
                {staleByTier.aging > 0 && (
                  <span style={{ color: stalenessConfig.aging.color }}>
                    {staleByTier.aging} aging
                  </span>
                )}
                {staleByTier.stale > 0 && (
                  <span style={{ color: stalenessConfig.stale.color }}>
                    {staleByTier.stale} stale
                  </span>
                )}
                {staleByTier.abandoned > 0 && (
                  <span style={{ color: stalenessConfig.abandoned.color }}>
                    {staleByTier.abandoned} abandoned
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Charts row */}
        <div className="mb-8 grid grid-cols-2 gap-4">
          {/* Tasks by Status */}
          <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
            <h2 className="mb-5 text-sm font-medium text-[#F7F7F8]">
              Tasks by Status
            </h2>
            <div className="space-y-4">
              {taskStatuses.map((status) => {
                const count = summary.byStatus[status] || 0;
                return (
                  <div key={status}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: statusColors[status],
                          }}
                        />
                        <span className="text-[#9494A0]">
                          {statusLabels[status]}
                        </span>
                      </div>
                      <span className="tabular-nums text-[#55555F]">
                        {count}
                        {summary.total > 0 && (
                          <span className="ml-1">
                            ({Math.round((count / summary.total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <HorizontalBar
                      value={count}
                      max={summary.total}
                      color={statusColors[status]}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks by Priority */}
          <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
            <h2 className="mb-5 text-sm font-medium text-[#F7F7F8]">
              Tasks by Priority
            </h2>
            <div className="space-y-4">
              {taskPriorities.map((priority) => {
                const count = summary.byPriority[priority] || 0;
                return (
                  <div key={priority}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: priorityColors[priority],
                          }}
                        />
                        <span className="text-[#9494A0]">
                          {priorityLabels[priority]}
                        </span>
                      </div>
                      <span className="tabular-nums text-[#55555F]">
                        {count}
                        {summary.total > 0 && (
                          <span className="ml-1">
                            ({Math.round((count / summary.total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    <HorizontalBar
                      value={count}
                      max={summary.total}
                      color={priorityColors[priority]}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Assignee distribution */}
        <div className="mb-8 rounded-xl border border-white/[0.06] bg-[#131316] p-6">
          <h2 className="mb-5 text-sm font-medium text-[#F7F7F8]">
            Tasks by Assignee
          </h2>
          <div className="space-y-4">
            {taskAssignees.map((assignee) => {
              const count = summary.byAssignee[assignee] || 0;
              return (
                <div key={assignee}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: assigneeColors[assignee],
                        }}
                      />
                      <span className="text-[#9494A0]">
                        {assigneeLabels[assignee]}
                      </span>
                    </div>
                    <span className="tabular-nums text-[#55555F]">
                      {count}
                      {summary.total > 0 && (
                        <span className="ml-1">
                          ({Math.round((count / summary.total) * 100)}%)
                        </span>
                      )}
                    </span>
                  </div>
                  <HorizontalBar
                    value={count}
                    max={summary.total}
                    color={assigneeColors[assignee]}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom row: Recently Completed + Stale Tasks */}
        <div className="grid grid-cols-2 gap-4">
          {/* Recently Completed */}
          <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
            <h2 className="mb-4 text-sm font-medium text-[#F7F7F8]">
              Recently Completed
            </h2>
            {summary.recentlyCompleted.length === 0 ? (
              <p className="text-xs text-[#55555F]">No completed tasks yet.</p>
            ) : (
              <div className="space-y-3">
                {summary.recentlyCompleted.map((task) => (
                  <a
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="truncate text-sm text-[#F7F7F8]">
                      {task.title}
                    </span>
                    <span className="ml-3 shrink-0 text-xs text-[#55555F]">
                      {relativeDate(task.updatedAt)}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Stale Tasks */}
          <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
            <h2 className="mb-4 text-sm font-medium text-[#F7F7F8]">
              Stale Tasks
            </h2>
            {summary.staleTasks.length === 0 ? (
              <p className="text-xs text-[#34D399]">
                All tasks are actively maintained.
              </p>
            ) : (
              <div className="space-y-3">
                {summary.staleTasks.map((task) => (
                  <a
                    key={task.id}
                    href={`/tasks/${task.id}`}
                    className="group flex items-start justify-between rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                          style={{
                            color: stalenessConfig[task.stalenessLevel].color,
                            backgroundColor: `${stalenessConfig[task.stalenessLevel].color}15`,
                          }}
                        >
                          {stalenessConfig[task.stalenessLevel].label}
                        </span>
                        <span className="truncate text-sm text-[#F7F7F8]">
                          {task.title}
                        </span>
                      </div>
                      <div className="mt-0.5 flex gap-2 text-[10px] text-[#55555F]">
                        <span>{statusLabels[task.status as TaskStatus]}</span>
                        <span>&middot;</span>
                        <span>
                          {priorityLabels[task.priority as TaskPriority]}
                        </span>
                      </div>
                    </div>
                    <span className="ml-3 shrink-0 text-xs text-[#55555F]">
                      {task.daysSinceUpdate}d ago
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  subColor,
  valueColor,
}: {
  label: string;
  value: number;
  sub?: string;
  subColor?: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#131316] p-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wider text-[#55555F]">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span
          className="text-3xl font-semibold tabular-nums"
          style={{ color: valueColor || "#F7F7F8" }}
        >
          {value}
        </span>
        {sub && (
          <span
            className="text-sm font-medium"
            style={{ color: subColor || "#9494A0" }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
