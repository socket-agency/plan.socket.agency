/**
 * Shared permission logic — importable from both server and client code.
 * No server-only dependencies (no Next.js request APIs, no DB, no auth).
 */

/** Fields a client is allowed to edit on their own backlog tasks. */
export const CLIENT_EDITABLE_FIELDS = [
  "title",
  "description",
  "priority",
  "assignee",
  "reviewer",
  "dueDate",
] as const;

/**
 * Returns true if the given user can edit the given task.
 * Owners can always edit. Clients can only edit tasks they created
 * that are still in "backlog" status.
 */
export function canEditTask(
  session: { userId: string; role: string },
  task: { createdBy: string | null; status: string },
): boolean {
  if (session.role === "owner") return true;
  return (
    session.role === "client" &&
    task.status === "backlog" &&
    task.createdBy !== null &&
    task.createdBy === session.userId
  );
}

/**
 * Returns null if the client attempted to change a forbidden field
 * (e.g. status, position), signaling a 403 should be returned.
 */
export function filterClientUpdates(
  updates: Record<string, unknown>,
): Record<string, unknown> | null {
  const forbidden = Object.keys(updates).filter(
    (key) => !(CLIENT_EDITABLE_FIELDS as readonly string[]).includes(key),
  );
  if (forbidden.length > 0) return null;
  return updates;
}
