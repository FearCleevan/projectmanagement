import {
  normalizeItemPriority,
  normalizeItemStatus,
  type Comment,
  type Module,
  type Project,
  type ProjectItem,
  type User,
} from "@/types/domain";

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

function slugifyModuleName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildModulesFromProjects(projects: Project[]): Module[] {
  return projects.flatMap((project) => {
    const modules = project.modules && project.modules.length > 0 ? project.modules : [project.module];
    return modules.map((moduleName) => ({
      id: `module-${project.id}-${slugifyModuleName(moduleName)}`,
      projectId: project.id,
      name: moduleName,
      createdAt: project.createdAt,
    }));
  });
}

export const demoModulesSeed: Module[] = buildModulesFromProjects(demoProjectsSeed);

export const demoItemsSeed: ProjectItem[] = [
  {
    id: "item-portal-kickoff",
    ticketId: "PRODUCT-1",
    projectId: "project-product-portal",
    moduleId: "module-project-product-portal-product",
    parentId: null,
    title: "Kickoff scope alignment",
    status: "IN_PROGRESS",
    priority: "HIGH",
    labelIds: ["UI/UX", "Frontend"],
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
    moduleId: "module-project-ops-handbook-operations",
    parentId: null,
    title: "Draft handbook outline",
    status: "TODO",
    priority: "MEDIUM",
    labelIds: ["Design", "API-Integration"],
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

type LegacyItemWithModule = ProjectItem & {
  module?: string;
};

type MigrateLegacyItemsInput = {
  items: unknown[];
  projects: Project[];
  existingModules?: Module[];
};

type MigrateLegacyItemsResult = {
  items: ProjectItem[];
  modules: Module[];
};

function normalizeProjectItem(raw: LegacyItemWithModule): ProjectItem {
  return {
    ...raw,
    moduleId: raw.moduleId ?? null,
    parentId: raw.parentId ?? null,
    status: normalizeItemStatus(raw.status),
    priority: normalizeItemPriority(raw.priority),
    labelIds: (raw.labelIds ?? raw.labels ?? []).map((label) => String(label)),
  };
}

export function migrateLegacyItemsToModules({
  items,
  projects,
  existingModules = [],
}: MigrateLegacyItemsInput): MigrateLegacyItemsResult {
  const modulesByKey = new Map<string, Module>();

  for (const moduleEntry of existingModules) {
    modulesByKey.set(`${moduleEntry.projectId}:${moduleEntry.name.toLowerCase()}`, moduleEntry);
  }

  for (const moduleEntry of buildModulesFromProjects(projects)) {
    const key = `${moduleEntry.projectId}:${moduleEntry.name.toLowerCase()}`;
    if (!modulesByKey.has(key)) {
      modulesByKey.set(key, moduleEntry);
    }
  }

  const normalizedItems = items
    .filter((item): item is LegacyItemWithModule => typeof item === "object" && item !== null)
    .map((item) => {
      const projectId = typeof item.projectId === "string" ? item.projectId : "";
      const legacyModuleName = typeof item.module === "string" ? item.module.trim() : "";
      let moduleId = typeof item.moduleId === "string" ? item.moduleId : null;

      if (!moduleId && projectId && legacyModuleName) {
        const key = `${projectId}:${legacyModuleName.toLowerCase()}`;
        let moduleEntry = modulesByKey.get(key);

        if (!moduleEntry) {
          moduleEntry = {
            id: `module-${projectId}-${slugifyModuleName(legacyModuleName)}`,
            projectId,
            name: legacyModuleName,
            createdAt: item.createdAt ?? new Date().toISOString(),
          };
          modulesByKey.set(key, moduleEntry);
        }

        moduleId = moduleEntry.id;
      }

      const withoutLegacyModule = { ...item };
      delete withoutLegacyModule.module;

      return normalizeProjectItem({
        ...withoutLegacyModule,
        moduleId,
      });
    });

  return {
    items: normalizedItems,
    modules: Array.from(modulesByKey.values()),
  };
}
