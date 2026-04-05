import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTaskTools } from "./tools/tasks";
import { registerCommentTools } from "./tools/comments";
import { registerAttachmentTools } from "./tools/attachments";
import { registerSummaryTools } from "./tools/summary";

export function createMcpServer() {
  const server = new McpServer({
    name: "plan-socket-agency",
    version: "1.0.0",
  }, {
    instructions:
      "Task management server for plan.socket.agency. " +
      "Use list_tasks to see all tasks, get_task for details, " +
      "get_task_comments and get_task_attachments for related data. " +
      "Use get_attachment_file to view image attachments inline. " +
      "Write operations (create/update/delete) require owner role.",
  });

  registerTaskTools(server);
  registerCommentTools(server);
  registerAttachmentTools(server);
  registerSummaryTools(server);

  return server;
}
