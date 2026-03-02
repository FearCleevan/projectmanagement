# Phase 1 Backend Foundation

## Scope

This document defines the first implementation slice for moving from client-only persisted state to server-backed data.

Phase 1 target outcomes:
- Add a database schema and migrations.
- Define stable API contracts for core entities.
- Start moving users/projects reads and writes to server endpoints.
- Keep Zustand for UI/session/cache only during transition.

## Proposed Runtime Boundary

- UI: Next.js App Router client components.
- API: Next.js Route Handlers under `src/app/api/v1/*`.
- Domain logic: `src/server/services/*`.
- Data access: `src/server/repos/*`.
- DB client + transactions: `src/server/db/*`.
- Validation: `src/server/validators/*`.
- Frontend fetch wrapper: `src/lib/api-client/*`.

## Data Model v1 (PostgreSQL)

### Notes
- All tables include `created_at` and `updated_at` unless noted.
- `org_id` is included early to avoid a second large migration for tenancy.
- Soft-delete uses `archived_at` (or `deleted_at` where semantic delete is preferred).

### Table Definitions

1. `organizations`
- `id` uuid pk
- `name` text not null
- `slug` text not null unique
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()

2. `users`
- `id` uuid pk
- `org_id` uuid not null fk -> organizations.id
- `name` text not null
- `email` text not null
- `password_hash` text nullable
- `external_auth_id` text nullable
- `role` text not null check in (`OWNER`,`ADMIN`,`MEMBER`)
- `position` text nullable
- `avatar_url` text nullable
- `archived_at` timestamptz nullable
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()
- unique (`org_id`, `email`)

3. `projects`
- `id` uuid pk
- `org_id` uuid not null fk -> organizations.id
- `project_code` text not null
- `title` text not null
- `description` text nullable
- `primary_module` text not null
- `owner_user_id` uuid not null fk -> users.id
- `cover_image_url` text nullable
- `archived_at` timestamptz nullable
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()
- unique (`org_id`, `project_code`)

4. `project_modules`
- `project_id` uuid not null fk -> projects.id
- `module` text not null
- pk (`project_id`, `module`)

5. `project_members`
- `project_id` uuid not null fk -> projects.id
- `user_id` uuid not null fk -> users.id
- `created_at` timestamptz not null default now()
- pk (`project_id`, `user_id`)

6. `items`
- `id` uuid pk
- `org_id` uuid not null fk -> organizations.id
- `project_id` uuid not null fk -> projects.id
- `ticket_id` text not null
- `title` text not null
- `description_html` text nullable
- `status` text not null
- `priority` text not null
- `created_by_user_id` uuid not null fk -> users.id
- `start_date` date nullable
- `due_date` date nullable
- `archived_at` timestamptz nullable
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()
- unique (`project_id`, `ticket_id`)

7. `item_labels`
- `item_id` uuid not null fk -> items.id
- `label` text not null
- pk (`item_id`, `label`)

8. `item_assignees`
- `item_id` uuid not null fk -> items.id
- `user_id` uuid not null fk -> users.id
- pk (`item_id`, `user_id`)

9. `comments`
- `id` uuid pk
- `org_id` uuid not null fk -> organizations.id
- `item_id` uuid not null fk -> items.id
- `author_user_id` uuid not null fk -> users.id
- `content_html` text not null
- `created_at` timestamptz not null default now()
- `updated_at` timestamptz not null default now()
- `deleted_at` timestamptz nullable

10. `activity_logs`
- `id` uuid pk
- `org_id` uuid not null fk -> organizations.id
- `actor_user_id` uuid nullable fk -> users.id
- `actor_name_snapshot` text not null
- `action` text not null
- `entity_type` text not null
- `entity_id` uuid not null
- `message` text not null
- `metadata_json` jsonb nullable
- `created_at` timestamptz not null default now()

11. `sessions`
- `id` uuid pk
- `user_id` uuid not null fk -> users.id
- `token_hash` text not null
- `expires_at` timestamptz not null
- `created_at` timestamptz not null default now()
- `revoked_at` timestamptz nullable

## API v1 Contract

Base path: `/api/v1`

1. `POST /auth/login`
2. `POST /auth/logout`
3. `GET /me`
4. `GET /users`
5. `POST /users`
6. `PATCH /users/:id`
7. `POST /users/:id/archive`
8. `DELETE /users/:id`
9. `GET /projects?module=&q=&page=`
10. `POST /projects`
11. `PATCH /projects/:id`
12. `POST /projects/:id/archive`
13. `DELETE /projects/:id`
14. `GET /projects/:id/items?status=&priority=&q=&page=`
15. `POST /projects/:id/items`
16. `PATCH /items/:id`
17. `POST /items/:id/archive`
18. `DELETE /items/:id`
19. `GET /items/:id/comments`
20. `POST /items/:id/comments`
21. `GET /activities?entityType=&page=`

## Endpoint Permission Matrix (Server-Enforced)

Roles: `OWNER`, `ADMIN`, `MEMBER`

1. `POST /auth/login`
- Access: public

2. `POST /auth/logout`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)

3. `GET /me`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)

4. `GET /users`
- Access: `OWNER|ADMIN`

5. `POST /users`
- Access: `OWNER|ADMIN`
- Constraint: `ADMIN` cannot create `OWNER`.

6. `PATCH /users/:id`
- Access: `OWNER|ADMIN`
- Constraints:
- `ADMIN` cannot modify `OWNER`.
- User may update own profile fields through a dedicated endpoint in Phase 2+.

7. `POST /users/:id/archive`
- Access: `OWNER|ADMIN`
- Constraints:
- Cannot archive self.
- `ADMIN` cannot archive `OWNER`.

8. `DELETE /users/:id`
- Access: `OWNER|ADMIN`
- Constraints:
- Cannot delete self.
- `ADMIN` cannot delete `OWNER`.

9. `GET /projects`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)

10. `POST /projects`
- Access: `OWNER|ADMIN`

11. `PATCH /projects/:id`
- Access: `OWNER|ADMIN`

12. `POST /projects/:id/archive`
- Access: `OWNER|ADMIN`

13. `DELETE /projects/:id`
- Access: `OWNER|ADMIN`

14. `GET /projects/:id/items`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: must be project member or org-level privileged role.

15. `POST /projects/:id/items`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: must be project member or org-level privileged role.

16. `PATCH /items/:id`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: must be project member or org-level privileged role.

17. `POST /items/:id/archive`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: must be project member or org-level privileged role.

18. `DELETE /items/:id`
- Access: `OWNER|ADMIN`

19. `GET /items/:id/comments`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: item visibility scope check required.

20. `POST /items/:id/comments`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: item visibility scope check required.

21. `GET /activities`
- Access: authenticated (`OWNER|ADMIN|MEMBER`)
- Constraint: org-scoped and permission-filtered by entity visibility.

## Migration Sequence (No Big-Bang)

1. Add DB + migration tooling.
2. Add API routes and validators with feature-flagged UI integration.
3. Move users module to server reads/writes.
4. Move projects module to server reads/writes.
5. Move items/comments.
6. Move activities.
7. Disable localStorage writes for migrated modules.

## Definition of Done (Phase 1)

- CRUD routes exist for users, projects, items, comments, activities.
- UI users/projects flows call API by default.
- LocalStorage is no longer source-of-truth for migrated modules.
- `lint` and `build` pass, plus initial API integration tests.
