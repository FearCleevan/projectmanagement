"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  demoCommentsSeed,
  demoItemsSeed,
  demoModulesSeed,
  demoProjectsSeed,
  demoUsersSeed,
  migrateLegacyItemsToModules,
} from "@/lib/seed";
import { seedIfEmpty } from "@/lib/storage";
import {
  normalizeItemPriority,
  normalizeItemStatus,
  type ActivityAction,
  type ActivityLog,
  type Comment,
  type Module,
  type ModuleType,
  type Project,
  type ProjectItem,
  type User,
} from "@/types/domain";

const APP_STORE_KEY = "internal-pm-app-store";
const USERS_SEED_KEY = "internal-pm-users-seed";
const PROJECTS_SEED_KEY = "internal-pm-projects-seed";
const MODULES_SEED_KEY = "internal-pm-modules-seed";
const ITEMS_SEED_KEY = "internal-pm-items-seed";
const COMMENTS_SEED_KEY = "internal-pm-comments-seed";
const ACTIVITIES_SEED_KEY = "internal-pm-activities-seed";
const MAX_PERSISTED_DATA_URL_LENGTH = 120_000;

type AppStoreState = {
  currentUser: User | null;
  selectedModule: ModuleType | null;
  projects: Project[];
  modules: Module[];
  items: ProjectItem[];
  comments: Comment[];
  activities: ActivityLog[];
  users: User[];
};

type AppStoreActions = {
  initializeSeedData: () => void;
  setCurrentUser: (user: User | null) => void;
  setSelectedModule: (module: ModuleType | null) => void;
  addProject: (project: Project) => void;
  archiveProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  addUser: (user: User) => void;
  updateUser: (user: User) => void;
  archiveUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
  createModule: (module: Module) => void;
  updateModule: (module: Module) => void;
  deleteModule: (moduleId: string) => void;
  getModulesByProject: (projectId: string) => Module[];
  createItem: (item: ProjectItem) => void;
  addItem: (item: ProjectItem) => void;
  archiveItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  updateItem: (item: ProjectItem) => void;
  getItemsByProject: (projectId: string) => ProjectItem[];
  getItemsByModule: (moduleId: string) => ProjectItem[];
  getChildItems: (parentId: string) => ProjectItem[];
  getRootItems: (projectId: string) => ProjectItem[];
  calculateItemProgress: (itemId: string) => number;
  calculateModuleProgress: (moduleId: string) => number;
  addComment: (comment: Comment) => void;
  setActivities: (activities: ActivityLog[]) => void;
  setProjects: (projects: Project[]) => void;
  setItems: (items: ProjectItem[]) => void;
  setComments: (comments: Comment[]) => void;
  setUsers: (users: User[]) => void;
  setModules: (modules: Module[]) => void;
  resetSession: () => void;
};

export type AppStore = AppStoreState & AppStoreActions;

const initialState: AppStoreState = {
  currentUser: null,
  selectedModule: null,
  projects: [],
  modules: [],
  items: [],
  comments: [],
  activities: [],
  users: [],
};

function makeActivity(
  state: AppStoreState,
  action: ActivityAction,
  message: string,
  entityType: ActivityLog["entityType"],
  entityId: string
): ActivityLog {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `activity-${Date.now()}`,
    action,
    message,
    actorId: state.currentUser?.id,
    actorName: state.currentUser?.name ?? "System",
    entityType,
    entityId,
    createdAt: now,
  };
}

function normalizeItemForStore(item: ProjectItem): ProjectItem {
  return {
    ...item,
    moduleId: item.moduleId ?? null,
    parentId: item.parentId ?? null,
    status: normalizeItemStatus(item.status),
    priority: normalizeItemPriority(item.priority),
    labelIds: (item.labelIds ?? item.labels ?? []).map((label) => String(label)),
  };
}

function isActiveItem(item: ProjectItem) {
  return !item.archived;
}

function isDone(item: ProjectItem) {
  return normalizeItemStatus(item.status) === "DONE";
}

function toPercentage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildItemsById(items: ProjectItem[]): Map<string, ProjectItem> {
  return new Map(items.map((item) => [item.id, item]));
}

function isInvalidParentReference(items: ProjectItem[], itemId: string, parentId: string | null | undefined) {
  if (!parentId) {
    return false;
  }

  if (parentId === itemId) {
    return true;
  }

  const itemsById = buildItemsById(items);
  let cursorId: string | null | undefined = parentId;

  while (cursorId) {
    if (cursorId === itemId) {
      return true;
    }

    const cursor = itemsById.get(cursorId);
    if (!cursor) {
      break;
    }

    cursorId = cursor.parentId ?? null;
  }

  return false;
}

function rollupParentStatuses(items: ProjectItem[], initialParentId: string | null | undefined): ProjectItem[] {
  if (!initialParentId) {
    return items;
  }

  const now = new Date().toISOString();
  const nextItems = items.map((item) => ({ ...item }));
  const itemsById = buildItemsById(nextItems);

  let cursorParentId: string | null | undefined = initialParentId;
  while (cursorParentId) {
    const parent = itemsById.get(cursorParentId);
    if (!parent || parent.archived) {
      break;
    }

    const children = nextItems.filter((item) => !item.archived && item.parentId === parent.id);
    if (children.length === 0) {
      cursorParentId = parent.parentId ?? null;
      continue;
    }

    const allDone = children.every((child) => normalizeItemStatus(child.status) === "DONE");
    let nextStatus = parent.status;

    if (allDone) {
      nextStatus = "DONE";
    } else if (normalizeItemStatus(parent.status) === "DONE") {
      nextStatus = "IN_PROGRESS";
    }

    if (nextStatus !== parent.status) {
      const updatedParent = { ...parent, status: nextStatus, updatedAt: now };
      itemsById.set(updatedParent.id, updatedParent);
      const index = nextItems.findIndex((item) => item.id === updatedParent.id);
      if (index >= 0) {
        nextItems[index] = updatedParent;
      }
    }

    cursorParentId = parent.parentId ?? null;
  }

  return nextItems;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      initializeSeedData: () => {
        const existingUsers = get().users ?? [];
        const existingProjects = get().projects ?? [];
        const existingModules = get().modules ?? [];
        const existingItems = get().items ?? [];
        const existingComments = get().comments ?? [];
        const existingActivities = get().activities ?? [];

        const nextUsers =
          existingUsers.length > 0 ? existingUsers : seedIfEmpty<User[]>(USERS_SEED_KEY, demoUsersSeed);
        const nextProjects =
          existingProjects.length > 0
            ? existingProjects
            : seedIfEmpty<Project[]>(PROJECTS_SEED_KEY, demoProjectsSeed);
        const seededModules =
          existingModules.length > 0
            ? existingModules
            : seedIfEmpty<Module[]>(MODULES_SEED_KEY, demoModulesSeed);
        const seededItems =
          existingItems.length > 0
            ? existingItems
            : seedIfEmpty<unknown[]>(ITEMS_SEED_KEY, demoItemsSeed as unknown[]);
        const nextComments =
          existingComments.length > 0
            ? existingComments
            : seedIfEmpty<Comment[]>(COMMENTS_SEED_KEY, demoCommentsSeed);
        const nextActivities =
          existingActivities.length > 0
            ? existingActivities
            : seedIfEmpty<ActivityLog[]>(ACTIVITIES_SEED_KEY, []);

        const migrated = migrateLegacyItemsToModules({
          items: seededItems as unknown[],
          projects: nextProjects,
          existingModules: seededModules,
        });

        set({
          users: nextUsers,
          projects: nextProjects,
          modules: migrated.modules,
          items: migrated.items.map(normalizeItemForStore),
          comments: nextComments,
          activities: nextActivities,
        });
      },
      setCurrentUser: (currentUser) => set({ currentUser }),
      setSelectedModule: (selectedModule) => set({ selectedModule }),
      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
          activities: [
            makeActivity(
              state,
              "PROJECT_CREATED",
              `Created project ${project.title} (${project.projectId}).`,
              "project",
              project.id
            ),
            ...state.activities,
          ].slice(0, 200),
        })),
      archiveProject: (projectId) =>
        set((state) => {
          const target = state.projects.find((project) => project.id === projectId);
          return {
            projects: state.projects.map((project) =>
              project.id === projectId
                ? { ...project, archived: true, updatedAt: new Date().toISOString() }
                : project
            ),
            activities: target
              ? [
                  makeActivity(
                    state,
                    "PROJECT_ARCHIVED",
                    `Archived project ${target.title} (${target.projectId}).`,
                    "project",
                    projectId
                  ),
                  ...state.activities,
                ].slice(0, 200)
              : state.activities,
          };
        }),
      deleteProject: (projectId) =>
        set((state) => {
          const target = state.projects.find((project) => project.id === projectId);
          const remainingItems = state.items.filter((item) => item.projectId !== projectId);
          const remainingItemIds = new Set(remainingItems.map((item) => item.id));

          return {
            projects: state.projects.filter((project) => project.id !== projectId),
            modules: state.modules.filter((module) => module.projectId !== projectId),
            items: remainingItems,
            comments: state.comments.filter((comment) => remainingItemIds.has(comment.itemId)),
            activities: target
              ? [
                  makeActivity(
                    state,
                    "PROJECT_DELETED",
                    `Deleted project ${target.title} (${target.projectId}).`,
                    "project",
                    projectId
                  ),
                  ...state.activities,
                ].slice(0, 200)
              : state.activities,
          };
        }),
      addUser: (user) =>
        set((state) => ({
          users: [user, ...state.users],
          activities: [
            makeActivity(state, "USER_CREATED", `Created user ${user.name} (${user.role}).`, "user", user.id),
            ...state.activities,
          ].slice(0, 200),
        })),
      updateUser: (user) =>
        set((state) => {
          const target = state.users.find((candidate) => candidate.id === user.id);
          if (!target) {
            return state;
          }

          return {
            users: state.users.map((candidate) => (candidate.id === user.id ? user : candidate)),
            currentUser: state.currentUser?.id === user.id ? user : state.currentUser,
            activities: [
              makeActivity(state, "USER_UPDATED", `Updated user ${user.name} (${user.role}).`, "user", user.id),
              ...state.activities,
            ].slice(0, 200),
          };
        }),
      archiveUser: (userId) =>
        set((state) => {
          const target = state.users.find((candidate) => candidate.id === userId);
          if (!target || target.archived) {
            return state;
          }

          return {
            users: state.users.map((candidate) =>
              candidate.id === userId ? { ...candidate, archived: true } : candidate
            ),
            currentUser: state.currentUser?.id === userId ? null : state.currentUser,
            selectedModule: state.currentUser?.id === userId ? null : state.selectedModule,
            activities: [
              makeActivity(state, "USER_ARCHIVED", `Archived user ${target.name}.`, "user", userId),
              ...state.activities,
            ].slice(0, 200),
          };
        }),
      deleteUser: (userId) =>
        set((state) => {
          const target = state.users.find((candidate) => candidate.id === userId);
          if (!target) {
            return state;
          }

          return {
            users: state.users.filter((candidate) => candidate.id !== userId),
            currentUser: state.currentUser?.id === userId ? null : state.currentUser,
            selectedModule: state.currentUser?.id === userId ? null : state.selectedModule,
            activities: [
              makeActivity(state, "USER_DELETED", `Deleted user ${target.name}.`, "user", userId),
              ...state.activities,
            ].slice(0, 200),
          };
        }),
      createModule: (module) =>
        set((state) => {
          const exists = state.modules.some((entry) => entry.id === module.id);
          if (exists) {
            return state;
          }

          return {
            modules: [module, ...state.modules],
          };
        }),
      updateModule: (module) =>
        set((state) => ({
          modules: state.modules.map((entry) => (entry.id === module.id ? module : entry)),
        })),
      deleteModule: (moduleId) =>
        set((state) => {
          const nextItems = state.items.map((item) =>
            item.moduleId === moduleId ? { ...item, moduleId: null } : item
          );

          return {
            modules: state.modules.filter((module) => module.id !== moduleId),
            items: nextItems,
          };
        }),
      getModulesByProject: (projectId) => get().modules.filter((module) => module.projectId === projectId),
      createItem: (item) =>
        set((state) => {
          const normalizedItem = normalizeItemForStore(item);
          const validParentId = normalizedItem.parentId ?? null;

          if (validParentId) {
            const parent = state.items.find((candidate) => candidate.id === validParentId);
            const invalidParent =
              !parent ||
              parent.projectId !== normalizedItem.projectId ||
              isInvalidParentReference(state.items, normalizedItem.id, validParentId);

            if (invalidParent) {
              return state;
            }
          }

          const project = state.projects.find((candidate) => candidate.id === normalizedItem.projectId);
          const assignees = normalizedItem.assigneeIds.length;
          const hasDescription = Boolean(normalizedItem.description && normalizedItem.description.trim());
          const ticketLabel = normalizedItem.ticketId ?? normalizedItem.id;
          const nextItems = rollupParentStatuses(
            [normalizedItem, ...state.items],
            normalizedItem.parentId ?? null
          );
          const messages: ActivityLog[] = [
            makeActivity(
              state,
              "ITEM_CREATED",
              `Created item ${ticketLabel} in ${project?.title ?? "project"}.`,
              "item",
              normalizedItem.id
            ),
          ];

          if (hasDescription) {
            messages.push(
              makeActivity(
                state,
                "ITEM_DESCRIPTION_UPDATED",
                `Added description to item ${ticketLabel}.`,
                "item",
                normalizedItem.id
              )
            );
          }

          if (assignees > 0) {
            messages.push(
              makeActivity(
                state,
                "ITEM_ASSIGNED",
                `Assigned ${assignees} user(s) to item ${ticketLabel}.`,
                "item",
                normalizedItem.id
              )
            );
          }

          return {
            items: nextItems,
            activities: [...messages, ...state.activities].slice(0, 200),
          };
        }),
      addItem: (item) => get().createItem(item),
      archiveItem: (itemId) =>
        set((state) => {
          const target = state.items.find((item) => item.id === itemId);
          return {
            items: state.items.map((item) =>
              item.id === itemId ? { ...item, archived: true, updatedAt: new Date().toISOString() } : item
            ),
            activities: target
              ? [
                  makeActivity(
                    state,
                    "ITEM_ARCHIVED",
                    `Archived item ${target.ticketId ?? target.id}.`,
                    "item",
                    itemId
                  ),
                  ...state.activities,
                ].slice(0, 200)
              : state.activities,
          };
        }),
      deleteItem: (itemId) =>
        set((state) => {
          const target = state.items.find((item) => item.id === itemId);
          return {
            items: state.items.filter((item) => item.id !== itemId),
            comments: state.comments.filter((comment) => comment.itemId !== itemId),
            activities: target
              ? [
                  makeActivity(
                    state,
                    "ITEM_DELETED",
                    `Deleted item ${target.ticketId ?? target.id}.`,
                    "item",
                    itemId
                  ),
                  ...state.activities,
                ].slice(0, 200)
              : state.activities,
          };
        }),
      updateItem: (item) =>
        set((state) => {
          const normalizedItem = normalizeItemForStore(item);
          const previous = state.items.find((candidate) => candidate.id === normalizedItem.id);
          const activities: ActivityLog[] = [];
          const ticketLabel = normalizedItem.ticketId ?? normalizedItem.id;

          if (!previous) {
            return state;
          }

          const nextParentId = normalizedItem.parentId ?? null;
          if (nextParentId) {
            const parent = state.items.find((candidate) => candidate.id === nextParentId);
            const invalidParent =
              !parent ||
              parent.projectId !== normalizedItem.projectId ||
              isInvalidParentReference(state.items, normalizedItem.id, nextParentId);

            if (invalidParent) {
              return state;
            }
          }

          if (previous.description !== normalizedItem.description) {
            activities.push(
              makeActivity(
                state,
                "ITEM_DESCRIPTION_UPDATED",
                `Updated description for item ${ticketLabel}.`,
                "item",
                normalizedItem.id
              )
            );
          }

          if ((previous.assigneeIds ?? []).join(",") !== (normalizedItem.assigneeIds ?? []).join(",")) {
            activities.push(
              makeActivity(
                state,
                "ITEM_ASSIGNED",
                `Updated assignees for item ${ticketLabel}.`,
                "item",
                normalizedItem.id
              )
            );
          }

          if (
            normalizeItemStatus(previous.status) !== normalizeItemStatus(normalizedItem.status) ||
            normalizeItemPriority(previous.priority) !== normalizeItemPriority(normalizedItem.priority)
          ) {
            activities.push(
              makeActivity(state, "ITEM_UPDATED", `Updated state of item ${ticketLabel}.`, "item", normalizedItem.id)
            );
          }

          const replacedItems = state.items.map((candidate) =>
            candidate.id === normalizedItem.id ? normalizedItem : candidate
          );
          const rolledFromPrevious = rollupParentStatuses(replacedItems, previous.parentId ?? null);
          const rolledFromNext = rollupParentStatuses(rolledFromPrevious, normalizedItem.parentId ?? null);

          return {
            items: rolledFromNext,
            activities: [...activities, ...state.activities].slice(0, 200),
          };
        }),
      getItemsByProject: (projectId) =>
        get()
          .items.filter((item) => isActiveItem(item) && item.projectId === projectId)
          .map(normalizeItemForStore),
      getItemsByModule: (moduleId) =>
        get()
          .items.filter((item) => isActiveItem(item) && item.moduleId === moduleId)
          .map(normalizeItemForStore),
      getChildItems: (parentId) =>
        get()
          .items.filter((item) => isActiveItem(item) && item.parentId === parentId)
          .map(normalizeItemForStore),
      getRootItems: (projectId) =>
        get()
          .items.filter((item) => isActiveItem(item) && item.projectId === projectId && item.parentId == null)
          .map(normalizeItemForStore),
      calculateItemProgress: (itemId) => {
        const items = get().items.filter(isActiveItem).map(normalizeItemForStore);
        const item = items.find((entry) => entry.id === itemId);

        if (!item) {
          return 0;
        }

        const children = items.filter((entry) => entry.parentId === itemId);
        if (children.length === 0) {
          return isDone(item) ? 100 : 0;
        }

        const doneCount = children.filter(isDone).length;
        return toPercentage((doneCount / children.length) * 100);
      },
      calculateModuleProgress: (moduleId) => {
        const state = get();
        const moduleItems = state.items
          .filter((item) => isActiveItem(item) && item.moduleId === moduleId)
          .map(normalizeItemForStore);
        const rootItems = moduleItems.filter((item) => item.parentId == null);

        if (rootItems.length === 0) {
          return 0;
        }

        const completedRoots = rootItems.filter((rootItem) => state.calculateItemProgress(rootItem.id) === 100)
          .length;
        return toPercentage((completedRoots / rootItems.length) * 100);
      },
      addComment: (comment) =>
        set((state) => {
          const target = state.items.find((item) => item.id === comment.itemId);
          return {
            comments: [comment, ...state.comments],
            activities: [
              makeActivity(
                state,
                "COMMENT_ADDED",
                `Added a comment to item ${target?.ticketId ?? comment.itemId}.`,
                "comment",
                comment.id
              ),
              ...state.activities,
            ].slice(0, 200),
          };
        }),
      setActivities: (activities) => set({ activities }),
      setProjects: (projects) => set({ projects }),
      setItems: (items) => set({ items: items.map(normalizeItemForStore) }),
      setComments: (comments) => set({ comments }),
      setUsers: (users) => set({ users }),
      setModules: (modules) => set({ modules }),
      resetSession: () => set({ currentUser: null, selectedModule: null }),
    }),
    {
      name: APP_STORE_KEY,
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => {
        const typedState = (persistedState ?? {}) as Partial<AppStoreState> & {
          items?: unknown[];
          modules?: Module[];
          projects?: Project[];
        };
        const projects = Array.isArray(typedState.projects) ? typedState.projects : [];
        const existingModules = Array.isArray(typedState.modules) ? typedState.modules : [];
        const rawItems = Array.isArray(typedState.items) ? typedState.items : [];
        const migrated = migrateLegacyItemsToModules({
          items: rawItems,
          projects,
          existingModules,
        });

        return {
          ...typedState,
          modules: migrated.modules,
          items: migrated.items.map(normalizeItemForStore),
        };
      },
      partialize: (state) => ({
        ...state,
        projects: state.projects.map((project) => {
          const coverImage = project.coverImage;
          const shouldDropCover =
            typeof coverImage === "string" &&
            coverImage.startsWith("data:") &&
            coverImage.length > MAX_PERSISTED_DATA_URL_LENGTH;

          return shouldDropCover ? { ...project, coverImage: undefined } : project;
        }),
      }),
    }
  )
);
