"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { demoCommentsSeed, demoItemsSeed, demoProjectsSeed, demoUsersSeed } from "@/lib/seed";
import { seedIfEmpty } from "@/lib/storage";
import type {
  ActivityAction,
  ActivityLog,
  Comment,
  ModuleType,
  Project,
  ProjectItem,
  User,
} from "@/types/domain";

const APP_STORE_KEY = "internal-pm-app-store";
const USERS_SEED_KEY = "internal-pm-users-seed";
const PROJECTS_SEED_KEY = "internal-pm-projects-seed";
const ITEMS_SEED_KEY = "internal-pm-items-seed";
const COMMENTS_SEED_KEY = "internal-pm-comments-seed";
const ACTIVITIES_SEED_KEY = "internal-pm-activities-seed";
const MAX_PERSISTED_DATA_URL_LENGTH = 120_000;

type AppStoreState = {
  currentUser: User | null;
  selectedModule: ModuleType | null;
  projects: Project[];
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
  addItem: (item: ProjectItem) => void;
  archiveItem: (itemId: string) => void;
  deleteItem: (itemId: string) => void;
  updateItem: (item: ProjectItem) => void;
  addComment: (comment: Comment) => void;
  setActivities: (activities: ActivityLog[]) => void;
  setProjects: (projects: Project[]) => void;
  setItems: (items: ProjectItem[]) => void;
  setComments: (comments: Comment[]) => void;
  setUsers: (users: User[]) => void;
  resetSession: () => void;
};

export type AppStore = AppStoreState & AppStoreActions;

const initialState: AppStoreState = {
  currentUser: null,
  selectedModule: null,
  projects: [],
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
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `activity-${Date.now()}`,
    action,
    message,
    actorId: state.currentUser?.id,
    actorName: state.currentUser?.name ?? "System",
    entityType,
    entityId,
    createdAt: now,
  };
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      initializeSeedData: () => {
        const existingUsers = get().users ?? [];
        const existingProjects = get().projects ?? [];
        const existingItems = get().items ?? [];
        const existingComments = get().comments ?? [];
        const existingActivities = get().activities ?? [];

        const nextUsers =
          existingUsers.length > 0 ? existingUsers : seedIfEmpty<User[]>(USERS_SEED_KEY, demoUsersSeed);
        const nextProjects =
          existingProjects.length > 0
            ? existingProjects
            : seedIfEmpty<Project[]>(PROJECTS_SEED_KEY, demoProjectsSeed);
        const nextItems =
          existingItems.length > 0
            ? existingItems
            : seedIfEmpty<ProjectItem[]>(ITEMS_SEED_KEY, demoItemsSeed);
        const nextComments =
          existingComments.length > 0
            ? existingComments
            : seedIfEmpty<Comment[]>(COMMENTS_SEED_KEY, demoCommentsSeed);
        const nextActivities =
          existingActivities.length > 0
            ? existingActivities
            : seedIfEmpty<ActivityLog[]>(ACTIVITIES_SEED_KEY, []);

        set({
          users: nextUsers,
          projects: nextProjects,
          items: nextItems,
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
      addItem: (item) =>
        set((state) => {
          const project = state.projects.find((candidate) => candidate.id === item.projectId);
          const assignees = item.assigneeIds.length;
          const hasDescription = Boolean(item.description && item.description.trim());
          const messages: ActivityLog[] = [
            makeActivity(
              state,
              "ITEM_CREATED",
              `Created item ${item.ticketId} in ${project?.title ?? "project"}.`,
              "item",
              item.id
            ),
          ];

          if (hasDescription) {
            messages.push(
              makeActivity(
                state,
                "ITEM_DESCRIPTION_UPDATED",
                `Added description to item ${item.ticketId}.`,
                "item",
                item.id
              )
            );
          }

          if (assignees > 0) {
            messages.push(
              makeActivity(
                state,
                "ITEM_ASSIGNED",
                `Assigned ${assignees} user(s) to item ${item.ticketId}.`,
                "item",
                item.id
              )
            );
          }

          return {
            items: [item, ...state.items],
            activities: [...messages, ...state.activities].slice(0, 200),
          };
        }),
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
                    `Archived item ${target.ticketId}.`,
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
                    `Deleted item ${target.ticketId}.`,
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
          const previous = state.items.find((candidate) => candidate.id === item.id);
          const activities: ActivityLog[] = [];

          if (previous) {
            if (previous.description !== item.description) {
              activities.push(
                makeActivity(
                  state,
                  "ITEM_DESCRIPTION_UPDATED",
                  `Updated description for item ${item.ticketId}.`,
                  "item",
                  item.id
                )
              );
            }

            if ((previous.assigneeIds ?? []).join(",") !== (item.assigneeIds ?? []).join(",")) {
              activities.push(
                makeActivity(
                  state,
                  "ITEM_ASSIGNED",
                  `Updated assignees for item ${item.ticketId}.`,
                  "item",
                  item.id
                )
              );
            }

            if (previous.status !== item.status || previous.priority !== item.priority) {
              activities.push(
                makeActivity(
                  state,
                  "ITEM_UPDATED",
                  `Updated state of item ${item.ticketId}.`,
                  "item",
                  item.id
                )
              );
            }
          }

          return {
            items: state.items.map((candidate) => (candidate.id === item.id ? item : candidate)),
            activities: [...activities, ...state.activities].slice(0, 200),
          };
        }),
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
      setItems: (items) => set({ items }),
      setComments: (comments) => set({ comments }),
      setUsers: (users) => set({ users }),
      resetSession: () => set({ currentUser: null, selectedModule: null }),
    }),
    {
      name: APP_STORE_KEY,
      storage: createJSONStorage(() => localStorage),
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
