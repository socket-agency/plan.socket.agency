# Multi-Tenant Multi-Project Architecture

## Context

plan.socket.agency is currently a single-tenant task management app with two roles (owner/client) and no concept of agencies or projects. All tasks live in one flat table. This redesign transforms it into a multi-tenant SaaS where:

- Any agency can sign up and create a workspace
- Users have global identities and join multiple agencies
- Each agency has multiple projects
- Clients are scoped to specific projects
- Tasks are filterable across any dimension

## Decisions

| Decision | Choice |
|---|---|
| Tenancy | Multi-tenant SaaS, self-service signup |
| Identity | Global (one account joins many agencies) |
| Client scope | Per-project (invited to specific projects) |
| Agency roles | Owner + Member |
| Project roles | Manager, Contributor, Client |
| Navigation | Workspace switcher in sidebar |
| Views | Per-project board, cross-project agency view, cross-agency My Tasks |
| Saved filters | Per-user, scoped to project/agency/global |
| Assignment | Specific users + team labels (agency/client) |
| AI keys | BYOK — agency owner provides Anthropic API key |
| Client API keys | Allowed by default, agency owner can disable |
| Architecture | Full relational hierarchy (Approach A) |

---

## 1. Data Model

### New Tables

#### `agencies`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, default `gen_random_uuid()` |
| `name` | text | NOT NULL |
| `slug` | text | NOT NULL, UNIQUE |
| `logoUrl` | text | nullable |
| `anthropicApiKey` | text | nullable, encrypted at app level |
| `allowClientApiKeys` | boolean | NOT NULL, default `true` |
| `createdAt` | timestamptz | NOT NULL, default `now()` |
| `updatedAt` | timestamptz | NOT NULL, default `now()` |

#### `agencyMembers`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `agencyId` | uuid | FK → agencies, NOT NULL |
| `userId` | uuid | FK → users, NOT NULL |
| `role` | enum | `'owner'` \| `'member'`, NOT NULL |
| `createdAt` | timestamptz | NOT NULL, default `now()` |

Unique constraint: `(agencyId, userId)`

#### `projects`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `agencyId` | uuid | FK → agencies, NOT NULL |
| `name` | text | NOT NULL |
| `slug` | text | NOT NULL |
| `description` | text | nullable |
| `status` | enum | `'active'` \| `'archived'`, default `'active'` |
| `createdAt` | timestamptz | NOT NULL, default `now()` |
| `updatedAt` | timestamptz | NOT NULL, default `now()` |

Unique constraint: `(agencyId, slug)`

#### `projectMembers`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `projectId` | uuid | FK → projects, NOT NULL |
| `userId` | uuid | FK → users, NOT NULL |
| `role` | enum | `'manager'` \| `'contributor'` \| `'client'`, NOT NULL |
| `createdAt` | timestamptz | NOT NULL, default `now()` |

Unique constraint: `(projectId, userId)`

#### `savedViews`

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `userId` | uuid | FK → users, NOT NULL |
| `agencyId` | uuid | FK → agencies, NOT NULL |
| `name` | text | NOT NULL |
| `scope` | enum | `'project'` \| `'agency'` \| `'global'` |
| `projectId` | uuid | FK → projects, nullable |
| `filters` | jsonb | NOT NULL |
| `isDefault` | boolean | NOT NULL, default `false` |
| `createdAt` | timestamptz | NOT NULL, default `now()` |

### Modified Tables

#### `users` — changes

- **Remove:** `role` column (now contextual per-agency via `agencyMembers`)
- **Remove:** `notificationPrefs` column (notification preferences are deferred — not part of this phase. The email digest system will be redesigned separately once the multi-tenant structure is stable.)
- **Remove:** `lastDigestSentAt` column (same — deferred with notifications)
- **Add:** `lastActiveAgencyId` (uuid, FK → agencies, nullable) — for workspace switcher memory
- **Add:** `avatarUrl` (text, nullable)

#### `tasks` — changes

- **Add:** `projectId` (uuid, FK → projects, NOT NULL)
- **Replace:** `assignee` enum → `assignedTo` (uuid, FK → users, nullable) + `team` enum (`'agency'` | `'client'`, NOT NULL, default `'agency'`)
- **Replace:** `reviewer` enum → `reviewerId` (uuid, FK → users, nullable)
- **Keep:** All other columns unchanged (status, priority, position, dueDate, createdBy, isDeleted, etc.)

#### `conversations` — changes

- **Add:** `agencyId` (uuid, FK → agencies, NOT NULL)

#### `apiKeys` — changes

- **Add:** `agencyId` (uuid, FK → agencies, NOT NULL)
- **Remove:** `role` column (derived from user's agency membership at query time)

### Unchanged Tables

- `comments` — no changes needed (already task-scoped)
- `attachments` — no changes needed
- `taskEvents` — no changes needed
- `chatMessages` — no changes needed
- `sentEmails` — no changes needed (will need agency-scoping later for notifications v2)

### Deferred: Notification Preferences

The current `notificationPrefs` and `lastDigestSentAt` columns on `users` are removed in this migration. The email notification system (digest emails, event emails) is **paused** during the multi-tenant transition and will be redesigned in a follow-up phase to support per-agency notification settings.

---

## 2. Authentication & Authorization

### Session

JWT payload simplifies to `{ userId: string }`. Role is contextual — resolved per-request from membership tables.

### Agency Context Resolution

| Request type | Context source |
|---|---|
| Page navigation | URL slug (`/acme/project-x/board`) |
| API calls | URL param (`/api/acme/tasks`) |
| MCP (API key) | `apiKeys.agencyId` |
| Global views (My Tasks) | No agency context — query across memberships |

### Permission Helpers

Replace current `requireAuth()` / `requireOwner()` with:

- **`requireAuth()`** — unchanged, returns `{ userId }`
- **`requireAgencyAccess(agencySlug)`** — resolves agency from slug, checks `agencyMembers`. Returns `{ userId, agencyId, agencyRole }`
- **`requireProjectAccess(agencySlug, projectSlug)`** — resolves agency + project, checks project-level access. Returns `{ userId, agencyId, projectId, projectRole, agencyRole }`

### Permission Matrix

| Action | Agency Owner | Agency Member | Project Manager | Project Contributor | Project Client |
|---|:---:|:---:|:---:|:---:|:---:|
| Create project | Yes | No | — | — | — |
| Delete project | Yes | No | — | — | — |
| Invite agency members | Yes | No | — | — | — |
| Invite project members | Yes | — | Yes | No | No |
| Invite project clients | Yes | — | Yes | No | No |
| View all projects | Yes | Yes | — | — | — |
| Create tasks | Yes | Yes | Yes | Yes | Backlog only |
| Edit any task | Yes | Yes | Yes | Yes | Own backlog only |
| Change task status | Yes | Yes | Yes | Yes | No |
| Delete tasks | Yes | Yes | Yes | No | No |
| Drag & drop reorder | Yes | Yes | Yes | Yes | No |
| View dashboard | Yes | Yes | Yes | No | No |
| Manage API keys | Own | Own | Own | Own | Own (if allowed) |
| Agency settings | Yes | No | — | — | — |

Agency owners and members have **implicit access to all projects** within the agency. Project-level roles apply to non-agency-members (clients) and optionally refine agency member permissions.

### Signup Flow

1. User registers (email + password → `users` row)
2. User creates agency (name + slug → `agencies` row + `agencyMembers` row with role `owner`)
3. User creates first project within agency
4. User invites team members (→ `agencyMembers`) and clients (→ `projectMembers` with role `client`)

---

## 3. URL Routing & Navigation

### URL Structure

```
/login                              — Public login
/register                           — Public signup

/agencies                           — Agency picker / create (post-login)
/my-tasks                           — Cross-agency personal task view

/<agencySlug>                       — Agency dashboard
/<agencySlug>/settings              — Agency settings (owner only)
/<agencySlug>/members               — Team management (owner only)
/<agencySlug>/api-keys              — API key management
/<agencySlug>/all-tasks             — Cross-project task list

/<agencySlug>/<projectSlug>         — Project board (kanban)
/<agencySlug>/<projectSlug>/tasks/<id>  — Task detail modal
/<agencySlug>/<projectSlug>/settings    — Project settings
/<agencySlug>/<projectSlug>/members     — Project member management
```

### Next.js App Router Structure

```
src/app/
├── layout.tsx                        # Root: fonts, theme
├── login/page.tsx                    # Public login
├── register/page.tsx                 # NEW: Public signup
│
├── (global)/                         # Auth'd, no agency context
│   ├── layout.tsx                    # Minimal layout
│   ├── agencies/page.tsx             # Agency picker / create
│   └── my-tasks/page.tsx             # Cross-agency task view
│
├── (workspace)/                      # Agency-scoped
│   ├── layout.tsx                    # Sidebar + agency context
│   └── [agencySlug]/
│       ├── page.tsx                  # Agency dashboard
│       ├── settings/page.tsx
│       ├── members/page.tsx
│       ├── api-keys/page.tsx
│       ├── all-tasks/page.tsx        # Cross-project task list
│       └── [projectSlug]/
│           ├── page.tsx              # Project board (kanban)
│           ├── tasks/[id]/page.tsx   # Task detail
│           ├── settings/page.tsx
│           └── members/page.tsx
│
└── api/
    ├── auth/...
    ├── agencies/                     # CRUD agencies
    ├── [agencySlug]/
    │   ├── projects/                 # CRUD projects
    │   ├── members/                  # Agency member management
    │   ├── all-tasks/                # Cross-project task queries
    │   └── [projectSlug]/
    │       ├── tasks/                # Project-scoped task CRUD
    │       │   └── [id]/
    │       │       ├── comments/
    │       │       ├── attachments/
    │       │       └── events/
    │       └── members/              # Project member management
    ├── my-tasks/                     # Cross-agency personal tasks
    ├── saved-views/                  # CRUD saved views
    ├── chat/                         # AI chat (agency-scoped)
    └── mcp/                          # MCP server (agency-scoped)
```

### Sidebar Navigation

**Agency owner/member view:**
- Agency switcher dropdown (top)
- Agency section: Dashboard, All Tasks, Members
- Projects section: list of projects with colored dots, "+" create button
- Saved Views section: user's custom filter presets
- Bottom: Settings, API Keys

**Client view (stripped down):**
- Agency switcher dropdown (top, shows agency name + "Client" badge)
- My Projects section: only projects they're invited to
- Bottom: Account Settings

### Post-Login Routing

- User belongs to 1 agency → redirect to `/<agencySlug>` (and then to first project)
- User belongs to multiple agencies → redirect to `/<lastActiveAgencySlug>` or `/agencies` if none set
- New user (no agencies) → redirect to `/agencies` (create first agency)

---

## 4. Filtering & Views

### Three View Scopes

1. **Project Board** (`/<agency>/<project>`) — kanban board for one project. Status is implicit (columns). Filters: priority, team, assignedTo, reviewer, dueDate, search.

2. **Agency All Tasks** (`/<agency>/all-tasks`) — list view aggregating all projects. Filters: project, status, priority, team, assignedTo, reviewer, dueDate, overdue, search.

3. **My Tasks** (`/my-tasks`) — cross-agency personal view. Tasks assigned to current user across all agencies. Grouped by agency → project. Filters: agency, project, status, priority, dueDate, overdue, search.

### Unified Filter Model

```typescript
interface TaskFilters {
  // Scope (determined by view)
  scope: 'project' | 'agency' | 'global'
  agencyId?: string
  projectId?: string

  // User-selectable filters
  status?: TaskStatus[]
  priority?: TaskPriority[]
  team?: ('agency' | 'client')[]
  assignedTo?: string[]       // user IDs
  reviewerId?: string[]       // user IDs
  createdBy?: string[]        // user IDs
  projects?: string[]         // project IDs (agency scope)
  agencies?: string[]         // agency IDs (global scope)

  // Date filters
  dueBefore?: string          // ISO date
  dueAfter?: string
  overdue?: boolean

  // Text search
  search?: string

  // Sort
  sortBy?: 'position' | 'priority' | 'dueDate' | 'updatedAt' | 'createdAt'
  sortDir?: 'asc' | 'desc'
}
```

Filters are serialized to URL query params for shareability and restored on page load.

### Saved Views

Stored in `savedViews` table. Each view captures:
- The scope (project, agency, or global)
- The filter JSON
- Optional project/agency binding
- Per-user (not shared)

Saved views appear in the sidebar under "Saved Views" section. Clicking one navigates to the appropriate view and applies filters.

---

## 5. Task Assignment

### New Model

- `assignedTo` (uuid, FK → users, nullable) — specific user assigned to the task
- `team` (enum: `'agency'` | `'client'`) — team label indicating which side owns the task
- `reviewerId` (uuid, FK → users, nullable) — specific user reviewing the task

### Team Label Logic

- When a task is assigned to an agency member → `team` auto-sets to `'agency'`
- When assigned to a project client → `team` auto-sets to `'client'`
- If unassigned, `team` can be set manually to indicate "this is agency-side work" or "this is client-side work"
- Team can always be overridden manually regardless of assignee

### User Picker

The assignee/reviewer dropdowns show project members grouped by team:
```
Agency Team
  ├── John (Owner)
  ├── Jane (Member)
Client Team
  ├── Alice (Client)
  └── Bob (Client)
```

---

## 6. AI Chat & MCP

### BYOK (Bring Your Own Key)

- Agency owner enters their Anthropic API key in agency settings
- Key stored in `agencies.anthropicApiKey`, encrypted at the application level before DB storage
- AI chat is **disabled** for the agency until a key is configured
- UI shows a prompt: "Configure your Anthropic API key in agency settings to enable AI chat"

### Chat Changes

- Conversations scoped to agency (`conversations.agencyId`)
- System prompt includes agency + project context
- Tools are permission-scoped: only return tasks the user can access
- Owner/member tools operate within the agency's projects
- Client tools limited to their projects with client-level restrictions

### MCP Changes

- API keys scoped to agency (`apiKeys.agencyId`)
- All MCP tools operate within the key's agency scope
- `list_tasks` accepts optional `projectSlug` filter
- `get_board_summary` can be project-scoped or agency-wide
- Client API keys: allowed if `agencies.allowClientApiKeys` is true

---

## 7. Invitation Flow

### Agency Member Invites

1. Agency owner enters email + role (owner/member) in agency members page
2. If user with that email exists → create `agencyMembers` row immediately, user sees new agency in switcher on next load
3. If user doesn't exist → create a pending invite record (email + role + agencyId + token). Send email with signup link containing invite token. On registration, auto-create the membership.

### Project Client Invites

1. Agency owner or project manager enters email + role (client) in project members page
2. Same logic as above: existing user → immediate membership, new user → pending invite with signup link
3. Client registering via invite link lands directly in the project board after signup

### Invite Data Model

Add an `invites` table (deferred — can start with existing-user-only invites and add email invites later):

| Column | Type | Constraints |
|---|---|---|
| `id` | uuid | PK |
| `email` | text | NOT NULL |
| `agencyId` | uuid | FK → agencies, NOT NULL |
| `projectId` | uuid | FK → projects, nullable |
| `role` | text | NOT NULL |
| `token` | text | NOT NULL, UNIQUE |
| `expiresAt` | timestamptz | NOT NULL |
| `acceptedAt` | timestamptz | nullable |
| `createdAt` | timestamptz | NOT NULL |

For the initial implementation, the invite flow can be simplified to existing-user-only (no email). Email-based invites with pending state can be added as a fast follow.

---

## 8. Migration Strategy

### Approach

Single Drizzle migration with backfill. All new columns start nullable, get backfilled, then constraints added.

### Steps

1. **Create new tables:** `agencies`, `agencyMembers`, `projects`, `projectMembers`, `savedViews`
2. **Insert default agency:** `{ name: "Socket Agency", slug: "socket-agency" }`
3. **Insert default project:** `{ name: "Default Project", slug: "default", agencyId: <above> }`
4. **Populate `agencyMembers`:** Only for users with `role = 'owner'` → `agencyMembers.role = 'owner'`. Clients do NOT become agency members.
5. **Populate `projectMembers`:** For owners → `role: 'manager'`. For clients → `role: 'client'`. Both get membership in the default project.
6. **Add `tasks.projectId`:** nullable, backfill with default project ID, then set NOT NULL
7. **Add `tasks.assignedTo`:** nullable user FK (leave null for now — current enum can't map cleanly to users)
8. **Add `tasks.team`:** backfill from current `assignee` column values
9. **Add `tasks.reviewerId`:** nullable user FK (leave null — same reason)
10. **Drop `tasks.assignee`** and **`tasks.reviewer`** (old enum columns)
11. **Add `conversations.agencyId`:** backfill with default agency
12. **Add `apiKeys.agencyId`:** backfill with default agency
13. **Modify `users`:** drop `role`, drop `notificationPrefs`, drop `lastDigestSentAt`, add `lastActiveAgencyId`, add `avatarUrl`

### Data Preservation

- No data is deleted — existing tasks, comments, attachments, events all preserved
- Old enum `assignee`/`reviewer` values captured in `team` column
- Users retain their accounts; roles move to membership tables

---

## 8. Verification Plan

### Database
- Run migration, verify all tables created with correct columns/constraints
- Verify existing data backfilled correctly (tasks have projectId, users have memberships)
- Verify unique constraints work (duplicate agency slugs rejected, duplicate memberships rejected)

### Auth
- Register new user → create agency → create project flow works end-to-end
- Login → workspace switcher shows agencies
- Agency context resolves correctly from URL slugs
- Permission helpers return correct roles
- Clients can only access their invited projects

### Board
- Project board shows only that project's tasks
- All Tasks view shows tasks from all projects in the agency
- My Tasks view shows tasks across agencies
- Filters work on all three view scopes
- Saved views persist and restore correctly
- Drag & drop still works on project board

### AI Chat
- Chat disabled when no API key configured
- Chat works with agency-provided API key
- Chat tools respect project scoping and permissions
- Client chat limited to read + backlog creation

### MCP
- API keys scoped to agency
- MCP tools respect agency/project boundaries
- Client MCP keys work when allowed, blocked when disabled
