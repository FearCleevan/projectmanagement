export type Role = "OWNER" | "ADMIN" | "MEMBER";

export const MODULE_TYPES = [
  "Projects",
  "Tasks",
  "Marketing",
  "Design",
  "CRM",
  "Software",
  "IT",
  "Operations",
  "Product",
] as const;

export type ModuleType = (typeof MODULE_TYPES)[number];

export function isModuleType(value: string | null | undefined): value is ModuleType {
  if (!value) {
    return false;
  }

  return (MODULE_TYPES as readonly string[]).includes(value);
}

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: Role;
  position?: string;
  avatarUrl?: string;
  archived?: boolean;
  createdAt: string;
};

export type Module = {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
};

export type Project = {
  id: string;
  projectId: string;
  module: ModuleType;
  modules: ModuleType[];
  title: string;
  description?: string;
  coverImage?: string;
  ownerId: string;
  memberIds: string[];
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalItemStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "DONE"
  | "BACK_TO_DEV"
  | "BACK_TO_DESIGN";

export const ITEM_STATUSES: ItemStatus[] = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "BACK_TO_DEV",
  "BACK_TO_DESIGN",
];

// Transitional compatibility for previously persisted values.
export type LegacyItemStatus =
  | "Backlog"
  | "Todo"
  | "Inprogress"
  | "In Review"
  | "Back to Dev"
  | "Back to Design"
  | "Done"
  | "Cancelled";

export type ItemStatus = CanonicalItemStatus | LegacyItemStatus;

export type CanonicalItemPriority = "LOW" | "MEDIUM" | "HIGH";
export type LegacyItemPriority = "Low" | "Medium" | "High" | "Urgent";
export type ItemPriority = CanonicalItemPriority | LegacyItemPriority;
export const ITEM_LABELS = [
  "UI/UX",
  "Design",
  "Frontend",
  "Backend",
  "Authentication",
  "API-Integration",
  "IT Admin",
  "DevOps",
  "Testing",
  "Documentation",
] as const;
export type ItemLabel = (typeof ITEM_LABELS)[number];

export type Item = {
  id: string;
  projectId: string;
  moduleId?: string | null;
  parentId?: string | null;
  ticketId: string;
  title: string;
  description?: string;
  status: ItemStatus;
  priority: ItemPriority;
  assigneeIds: string[];
  labelIds?: string[];
  startDate?: string;
  dueDate?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy: string;
  // Transitional compatibility fields for existing UI/state usage.
  labels?: ItemLabel[];
};

export type ProjectItem = Item;

export type Comment = {
  id: string;
  itemId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
};

export type ActivityAction =
  | "PROJECT_CREATED"
  | "PROJECT_ARCHIVED"
  | "PROJECT_DELETED"
  | "ITEM_CREATED"
  | "ITEM_UPDATED"
  | "ITEM_ARCHIVED"
  | "ITEM_DELETED"
  | "ITEM_ASSIGNED"
  | "ITEM_DESCRIPTION_UPDATED"
  | "COMMENT_ADDED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "USER_ARCHIVED"
  | "USER_DELETED";

export type ActivityLog = {
  id: string;
  action: ActivityAction;
  message: string;
  actorId?: string;
  actorName: string;
  entityType: "project" | "item" | "comment" | "user";
  entityId: string;
  createdAt: string;
};

export function normalizeItemStatus(value: string | null | undefined): CanonicalItemStatus {
  switch (value) {
    case "BACKLOG":
    case "Backlog":
      return "BACKLOG";
    case "TODO":
    case "Todo":
      return "TODO";
    case "IN_PROGRESS":
    case "Inprogress":
    case "In Review":
      return "IN_PROGRESS";
    case "DONE":
    case "Done":
    case "Cancelled":
      return "DONE";
    case "BACK_TO_DEV":
    case "Back to Dev":
      return "BACK_TO_DEV";
    case "BACK_TO_DESIGN":
    case "Back to Design":
      return "BACK_TO_DESIGN";
    default:
      return "BACKLOG";
  }
}

export function normalizeItemPriority(value: string | null | undefined): CanonicalItemPriority {
  switch (value) {
    case "LOW":
    case "Low":
      return "LOW";
    case "MEDIUM":
    case "Medium":
      return "MEDIUM";
    case "HIGH":
    case "High":
    case "Urgent":
      return "HIGH";
    default:
      return "MEDIUM";
  }
}
