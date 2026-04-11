# TODO — Production Readiness

## Auth & Security
- [ ] Replace password auth with magic links (email-based, passwordless)
- [ ] Add OAuth providers (Google, GitHub) via NextAuth.js / Auth.js
- [ ] Add password reset flow
- [ ] Add signup flow for new clients (owner-invited)
- [ ] Rate limiting on login and API routes
- [ ] CSRF protection
- [ ] Input sanitization and XSS prevention audit
- [ ] Audit all API routes for authorization edge cases

## Multi-tenancy & Projects
- [ ] Add `projects` table — tasks belong to a project
- [ ] Add `workspaces` table — multiple clients per workspace
- [ ] Project-level permissions (client sees only their project's tasks)
- [ ] Multiple clients support with per-client access control

## Task Features
- [ ] Labels/tags system
- [ ] Subtasks and checklists
- [x] File attachments (Vercel Blob)
- [x] Comments on tasks (both owner and client)
- [x] Task activity log / audit trail
- [ ] Assignee field expanded to support individual team members
- [ ] Task difficulty/points field (for weighted progress tracking — currently each task = 1 point)
- [ ] Estimated hours and time tracking
- [ ] Recurring tasks
- [ ] Task templates

## Views & UI
- [ ] Calendar view (tasks by due date)
- [ ] Timeline / Gantt chart view
- [ ] Custom filters and saved views
- [ ] Bulk actions (multi-select tasks, batch move/delete)
- [ ] Keyboard shortcuts
- [ ] Mobile-responsive improvements
- [ ] Dashboard chart library evolution — add shadcn/ui charts (Recharts) for time-series, pie, and advanced visualizations when needed (currently pure CSS)
- [ ] Dark/light mode toggle (currently dark-only)
- [ ] Customizable kanban columns (owner-defined statuses)

## AI Chat
- [x] Persist chat history in database
- [ ] Client write permissions via AI chat (with owner approval workflow)
- [ ] AI notifications — owner gets notified of client AI interactions
- [ ] Conversation context: include recent activity, not just current tasks
- [ ] RAG over project documents/files for richer AI answers
- [ ] AI-generated status reports on a schedule (email to client)

## Notifications
- [ ] In-app notification system
- [x] Email notifications (task updates, comments, activity digests)
- [ ] Client edit notifications for owner (when client write is enabled)
- [ ] Webhook integrations (Slack, Discord)

## Performance & Infrastructure
- [ ] Upgrade Vercel to Pro plan — Hobby limits cron jobs to daily; digest cron was downgraded from hourly to daily (`0 9 * * *`) as a workaround
- [ ] Database connection pooling
- [ ] API response caching (SWR / React Query)
- [ ] Optimistic UI updates for drag-and-drop
- [x] Database indexes on frequently queried columns
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Vercel Analytics or PostHog)
- [ ] Automated backups

## DevOps & Quality
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] E2E tests (Playwright)
- [ ] Unit tests for API routes and auth
- [ ] Component tests (Vitest + Testing Library)
- [ ] Database migrations strategy for production
- [ ] Staging environment
- [ ] Environment variable validation (zod)

## Integrations
- [ ] Zapier / Make webhooks for task events
- [ ] GitHub integration (link PRs to tasks)
- [ ] Slack bot for task updates
- [ ] Email-to-task creation
- [ ] Calendar sync (Google Calendar, iCal)
