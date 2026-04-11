import { defineTool, type McpServer } from "@/lib/mcp/define-tool";
import { getBoardSummary } from "@/lib/board-summary";

export function registerSummaryTools(server: McpServer) {
  defineTool(server,
    "get_board_summary",
    "Get a summary of the board: counts per status, priority, assignee, overdue tasks, staleness score, and completion rate",
    {},
    async () => {
      const summary = await getBoardSummary();

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(summary, null, 2) },
        ],
      };
    }
  );
}
