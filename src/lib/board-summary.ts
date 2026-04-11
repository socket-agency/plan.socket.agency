import { db } from "@/db";
import { tasks, notDeleted } from "@/db/schema";

export type StalenessLevel = "aging" | "stale" | "abandoned";

export interface StaleTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  updatedAt: Date;
  daysSinceUpdate: number;
  stalenessLevel: StalenessLevel;
}

export interface BoardSummary {
  total: number;
  done: number;
  completionRate: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byAssignee: Record<string, number>;
  byReviewer: Record<string, number>;
  overdue: number;
  recentlyCompleted: Array<{ id: string; title: string; updatedAt: Date }>;
  staleTasks: StaleTask[];
  stalenessScore: number;
}

const STALENESS_THRESHOLDS = {
  aging: 7,
  stale: 14,
  abandoned: 30,
} as const;

const STALENESS_WEIGHTS = {
  aging: 1,
  stale: 3,
  abandoned: 5,
} as const;

function getStalenessLevel(daysSinceUpdate: number): StalenessLevel | null {
  if (daysSinceUpdate >= STALENESS_THRESHOLDS.abandoned) return "abandoned";
  if (daysSinceUpdate >= STALENESS_THRESHOLDS.stale) return "stale";
  if (daysSinceUpdate >= STALENESS_THRESHOLDS.aging) return "aging";
  return null;
}

export async function getBoardSummary(): Promise<BoardSummary> {
  const allTasks = await db.select().from(tasks).where(notDeleted);
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const byStatus: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const byAssignee: Record<string, number> = {};
  const byReviewer: Record<string, number> = {};
  let overdue = 0;

  const recentlyCompleted: BoardSummary["recentlyCompleted"] = [];
  const staleTasks: StaleTask[] = [];

  for (const t of allTasks) {
    byStatus[t.status] = (byStatus[t.status] || 0) + 1;
    byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
    byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
    if (t.reviewer) byReviewer[t.reviewer] = (byReviewer[t.reviewer] || 0) + 1;

    if (t.dueDate && t.dueDate < todayStr && t.status !== "done") {
      overdue++;
    }

    if (t.status === "done") {
      recentlyCompleted.push({
        id: t.id,
        title: t.title,
        updatedAt: t.updatedAt,
      });
    }

    // Staleness check for non-done tasks
    if (t.status !== "done") {
      const daysSinceUpdate = Math.floor(
        (today.getTime() - t.updatedAt.getTime()) / (1000 * 60 * 60 * 24),
      );
      const level = getStalenessLevel(daysSinceUpdate);
      if (level) {
        staleTasks.push({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          updatedAt: t.updatedAt,
          daysSinceUpdate,
          stalenessLevel: level,
        });
      }
    }
  }

  // Sort recently completed by updatedAt desc, take top 5
  recentlyCompleted.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  const topCompleted = recentlyCompleted.slice(0, 5);

  // Sort stale tasks worst-first (abandoned > stale > aging, then by days desc)
  const levelOrder: Record<StalenessLevel, number> = { abandoned: 0, stale: 1, aging: 2 };
  staleTasks.sort(
    (a, b) =>
      levelOrder[a.stalenessLevel] - levelOrder[b.stalenessLevel] ||
      b.daysSinceUpdate - a.daysSinceUpdate,
  );

  // Staleness score: weighted sum / max possible, scaled to 0-100
  const activeTasks = allTasks.filter((t) => t.status !== "done").length;
  let stalenessScore = 0;
  if (activeTasks > 0) {
    const weightedSum = staleTasks.reduce(
      (sum, t) => sum + STALENESS_WEIGHTS[t.stalenessLevel],
      0,
    );
    stalenessScore = Math.round((weightedSum / (activeTasks * STALENESS_WEIGHTS.abandoned)) * 100);
  }

  const done = byStatus["done"] || 0;

  return {
    total: allTasks.length,
    done,
    completionRate: allTasks.length
      ? Math.round((done / allTasks.length) * 100)
      : 0,
    byStatus,
    byPriority,
    byAssignee,
    byReviewer,
    overdue,
    recentlyCompleted: topCompleted,
    staleTasks,
    stalenessScore,
  };
}
