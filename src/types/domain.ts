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
  avatarUrl?: string;
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

export const ITEM_STATUSES = [
  "Backlog",
  "Todo",
  "Inprogress",
  "In Review",
  "Back to Dev",
  "Back to Design",
  "Done",
  "Cancelled",
] as const;
export type ItemStatus = (typeof ITEM_STATUSES)[number];
export type ItemPriority = "Low" | "Medium" | "High" | "Urgent";
export const ITEM_LABELS = [
  "UI/UX",
  "Design",
  "Frontend",
  "Backend",
  "Authentication",
  "API-Integration",
] as const;
export type ItemLabel = (typeof ITEM_LABELS)[number];

export type ProjectItem = {
  id: string;
  ticketId: string;
  projectId: string;
  title: string;
  description?: string;
  status: ItemStatus;
  priority: ItemPriority;
  labels: ItemLabel[];
  assigneeIds: string[];
  startDate?: string;
  dueDate?: string;
  createdBy: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
};

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
  | "USER_CREATED";

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
