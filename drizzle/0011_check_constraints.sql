ALTER TABLE "users" ADD CONSTRAINT users_role_check CHECK (role IN ('owner', 'client'));

ALTER TABLE "tasks" ADD CONSTRAINT tasks_status_check CHECK (status IN ('backlog', 'todo', 'in_progress', 'in_review', 'done'));

ALTER TABLE "tasks" ADD CONSTRAINT tasks_priority_check CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE "tasks" ADD CONSTRAINT tasks_assignee_check CHECK (assignee IN ('agency', 'client'));

ALTER TABLE "tasks" ADD CONSTRAINT tasks_reviewer_check CHECK (reviewer IS NULL OR reviewer IN ('agency', 'client'));

ALTER TABLE "api_keys" ADD CONSTRAINT api_keys_role_check CHECK (role IN ('owner', 'client'));

ALTER TABLE "task_events" ADD CONSTRAINT task_events_type_check CHECK (type IN ('task_created', 'status_changed', 'priority_changed', 'assignee_changed', 'reviewer_changed', 'due_date_changed', 'title_changed', 'description_changed', 'comment_added', 'attachment_added', 'attachment_removed', 'task_deleted'));

ALTER TABLE "sent_emails" ADD CONSTRAINT sent_emails_type_check CHECK (type IN ('event', 'digest'));

ALTER TABLE "chat_messages" ADD CONSTRAINT chat_messages_role_check CHECK (role IN ('user', 'assistant', 'system'));
