import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { db } from "@/db";
import { tasks, notDeleted } from "@/db/schema";

export function registerSummaryTools(server: McpServer) {
  server.tool(
    "get_board_summary",
    "Get a summary of the board: counts per status, priority, assignee, overdue tasks, and completion rate",
    {},
    async () => {
      const allTasks = await db.select().from(tasks).where(notDeleted);
      const today = new Date().toISOString().split("T")[0];

      const byStatus: Record<string, number> = {};
      const byPriority: Record<string, number> = {};
      const byAssignee: Record<string, number> = {};
      let overdue = 0;

      for (const t of allTasks) {
        byStatus[t.status] = (byStatus[t.status] || 0) + 1;
        byPriority[t.priority] = (byPriority[t.priority] || 0) + 1;
        byAssignee[t.assignee] = (byAssignee[t.assignee] || 0) + 1;
        if (t.dueDate && t.dueDate < today && t.status !== "done") {
          overdue++;
        }
      }

      const result = {
        total: allTasks.length,
        byStatus,
        byPriority,
        byAssignee,
        overdue,
        completionRate: allTasks.length
          ? Math.round(((byStatus["done"] || 0) / allTasks.length) * 100)
          : 0,
      };

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(result, null, 2) },
        ],
      };
    }
  );
}
