import type { Comment, Project, ProjectItem, User } from "@/types/domain";

const seededAt = "2026-03-01T00:00:00.000Z";

export const demoUsersSeed: User[] = [
  {
    id: "user-owner-demo",
    name: "Demo Owner",
    email: "owner@demo.com",
    password: "Owner123!",
    role: "OWNER",
    createdAt: seededAt,
  },
  {
    id: "user-admin-demo",
    name: "Demo Admin",
    email: "admin@demo.com",
    password: "Admin123!",
    role: "ADMIN",
    createdAt: seededAt,
  },
  {
    id: "user-member-demo",
    name: "Demo Member",
    email: "member@demo.com",
    password: "Member123!",
    role: "MEMBER",
    createdAt: seededAt,
  },
];

export const demoProjectsSeed: Project[] = [
  {
    id: "project-product-portal",
    projectId: "PRJ-001",
    module: "Product",
    modules: ["Product", "Design"],
    title: "Product Portal Revamp",
    description: "Refresh roadmap visibility and stakeholder reporting across teams.",
    ownerId: "user-owner-demo",
    memberIds: ["user-admin-demo", "user-member-demo"],
    coverImage:
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2Q1ZGFlMCIvPjxjaXJjbGUgY3g9IjE2MCIgY3k9IjE1MCIgcj0iMTIwIiBmaWxsPSIjYzJjOWQzIi8+PGNpcmNsZSBjeD0iNTQwIiBjeT0iMTUwIiByPSIxNTAiIGZpbGw9IiNiNGJkYzkiLz48L3N2Zz4=",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "project-ops-handbook",
    projectId: "PRJ-002",
    module: "Operations",
    modules: ["Operations", "Tasks"],
    title: "Operations Handbook",
    description: "Standardize recurring workflows and execution checklists.",
    ownerId: "user-admin-demo",
    memberIds: ["user-member-demo"],
    coverImage:
      "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iMzAwIj48cmVjdCB3aWR0aD0iODAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2UxZTVlYSIvPjxjaXJjbGUgY3g9IjI4MCIgY3k9IjE1MCIgcj0iMTQwIiBmaWxsPSIjYzVkMmRhIi8+PGNpcmNsZSBjeD0iNjAwIiBjeT0iMTUwIiByPSIxMDAiIGZpbGw9IiNiNmMwY2EiLz48L3N2Zz4=",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];

export const demoItemsSeed: ProjectItem[] = [
  {
    id: "item-portal-kickoff",
    ticketId: "PRODUCT-1",
    projectId: "project-product-portal",
    title: "Kickoff scope alignment",
    status: "Inprogress",
    priority: "High",
    labels: ["UI/UX", "Frontend"],
    assigneeIds: ["user-admin-demo"],
    startDate: "2026-03-02",
    dueDate: "2026-03-10",
    createdBy: "user-owner-demo",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
  {
    id: "item-ops-outline",
    ticketId: "OPERATIONS-1",
    projectId: "project-ops-handbook",
    title: "Draft handbook outline",
    status: "Todo",
    priority: "Medium",
    labels: ["Design", "API-Integration"],
    assigneeIds: ["user-member-demo"],
    startDate: "2026-03-03",
    dueDate: "2026-03-12",
    createdBy: "user-admin-demo",
    createdAt: seededAt,
    updatedAt: seededAt,
  },
];

export const demoCommentsSeed: Comment[] = [
  {
    id: "comment-kickoff-1",
    itemId: "item-portal-kickoff",
    authorId: "user-owner-demo",
    content: "Let's lock stakeholders before Wednesday.",
    createdAt: seededAt,
  },
];
