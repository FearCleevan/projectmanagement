"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";
import {
  Check,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Grid2x2,
  GripVertical,
  KanbanSquare,
  List,
  ListTodo,
  Plus,
  Search,
  Table2,
  Tag,
  User,
  Users,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";

import { CreateModuleDialog } from "@/components/ui-kit/create-module-dialog";
import { CreateItemDialog } from "@/components/ui-kit/create-item-dialog";
import { EmptyState } from "@/components/ui-kit/empty-state";
import { ItemSheet } from "@/components/ui-kit/item-sheet";
import { DateRangePicker } from "@/components/ui-kit/date-range-picker";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useAppStore } from "@/store/app-store";
import {
  ITEM_STATUSES,
  type ItemLabel,
  type Module,
  type ItemPriority,
  type ItemStatus,
  type ProjectItem,
  type User as DomainUser,
} from "@/types/domain";

const ALL_FILTER = "all";
const STATUSES: ItemStatus[] = [...ITEM_STATUSES];
const PRIORITIES: ItemPriority[] = ["Low", "Medium", "High", "Urgent"];
const LABEL_COLORS: Record<ItemLabel, string> = {
  "UI/UX": "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  Design: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  Frontend: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  Backend: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  Authentication: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "API-Integration": "bg-orange-500/15 text-orange-700 dark:text-orange-300",
  "IT Admin": "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  DevOps: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
  Testing: "bg-pink-500/15 text-pink-700 dark:text-pink-300",
  Documentation: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
};

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;
  const hydrated = useStoreHydrated();

  const currentUser = useAppStore((state) => state.currentUser);
  const projects = useAppStore((state) => state.projects);
  const modules = useAppStore((state) => state.modules);
  const items = useAppStore((state) => state.items);
  const users = useAppStore((state) => state.users);
  const comments = useAppStore((state) => state.comments);
  const createModule = useAppStore((state) => state.createModule);
  const createItem = useAppStore((state) => state.createItem);
  const calculateItemProgress = useAppStore((state) => state.calculateItemProgress);
  const calculateModuleProgress = useAppStore((state) => state.calculateModuleProgress);
  const archiveItem = useAppStore((state) => state.archiveItem);
  const deleteItem = useAppStore((state) => state.deleteItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const addComment = useAppStore((state) => state.addComment);

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = React.useState<string>(ALL_FILTER);
  const [moduleFilter, setModuleFilter] = React.useState<string>(ALL_FILTER);
  const [moduleFilterOpen, setModuleFilterOpen] = React.useState(false);
  const [createModuleDialogOpen, setCreateModuleDialogOpen] = React.useState(false);
  const [newItemDialogOpen, setNewItemDialogOpen] = React.useState(false);
  const [itemSheetOpen, setItemSheetOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = React.useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const project = React.useMemo(
    () => projects.find((candidate) => candidate.id === projectId),
    [projectId, projects]
  );

  const canCreateItems = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";
  const canManageModules = canCreateItems;

  const projectModules = React.useMemo(() => {
    if (!project) {
      return [];
    }

    return modules.filter((module) => module.projectId === project.id);
  }, [modules, project]);

  const moduleById = React.useMemo(
    () => new Map(projectModules.map((module) => [module.id, module])),
    [projectModules]
  );

  const projectItems = React.useMemo(() => {
    if (!project) {
      return [];
    }

    return items.filter((item) => item.projectId === project.id && !item.archived);
  }, [items, project]);

  const projectCode = React.useMemo(() => {
    if (!project) {
      return "ITEM";
    }

    const normalized = project.module.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return normalized || "ITEM";
  }, [project]);

  const filteredItems = React.useMemo(() => {
    return projectItems.filter((item) => {
      const matchesQuery =
        query.trim().length === 0 ||
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        toPlainText(item.description ?? "").toLowerCase().includes(query.toLowerCase());
      const matchesStatus = statusFilter === ALL_FILTER || item.status === statusFilter;
      const matchesPriority = priorityFilter === ALL_FILTER || item.priority === priorityFilter;
      const matchesModule =
        moduleFilter === ALL_FILTER || (item.moduleId ?? "none") === moduleFilter;

      return matchesQuery && matchesStatus && matchesPriority && matchesModule;
    });
  }, [moduleFilter, priorityFilter, projectItems, query, statusFilter]);

  const filteredRoots = React.useMemo(
    () => filteredItems.filter((item) => item.parentId == null),
    [filteredItems]
  );

  const childrenByParentId = React.useMemo(() => {
    const map = new Map<string, ProjectItem[]>();
    for (const item of filteredItems) {
      if (!item.parentId) {
        continue;
      }

      const children = map.get(item.parentId) ?? [];
      children.push(item);
      map.set(item.parentId, children);
    }
    return map;
  }, [filteredItems]);

  const groupedForKanban = React.useMemo(() => {
    return STATUSES.map((status) => ({
      status,
      items: filteredRoots.filter((item) => item.status === status),
    }));
  }, [filteredRoots]);

  const usersById = React.useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );
  const activeModuleLabel = React.useMemo(() => {
    if (moduleFilter === ALL_FILTER) {
      return "All Modules";
    }

    return projectModules.find((module) => module.id === moduleFilter)?.name ?? "Unknown Module";
  }, [moduleFilter, projectModules]);

  const activeItem = React.useMemo(
    () => projectItems.find((item) => item.id === activeItemId) ?? null,
    [activeItemId, projectItems]
  );

  const handleNewItem = () => {
    if (!canCreateItems) {
      toast.error("Only Owner/Admin can create items.");
      return;
    }

    setNewItemDialogOpen(true);
  };

  const handleCreateItem = (item: ProjectItem) => {
    if (!canCreateItems) {
      toast.error("Only Owner/Admin can create items.");
      return;
    }

    createItem(item);
    toast.success("Item created.");
  };

  const handleCreateModule = (module: Module) => {
    if (!canManageModules) {
      toast.error("Only Owner/Admin can create modules.");
      return;
    }

    const normalizedName = module.name.trim().toLowerCase();
    if (
      projectModules.some((projectModule) => projectModule.name.trim().toLowerCase() === normalizedName)
    ) {
      toast.error("A module with this name already exists.");
      return;
    }

    createModule(module);
    toast.success("Module created.");
  };

  const handleOpenItem = (itemId: string) => {
    setActiveItemId(itemId);
    setItemSheetOpen(true);
  };

  const handleKanbanDragEnd = (event: DragEndEvent) => {
    const activeData = event.active.data.current as { itemId?: string } | undefined;
    const overData = event.over?.data.current as
      | { type?: "column" | "card"; status?: ItemStatus }
      | undefined;

    setDraggingItemId(null);

    const itemId = activeData?.itemId;
    if (!itemId || !overData?.status) {
      return;
    }

    const draggedItem = projectItems.find((item) => item.id === itemId);
    if (!draggedItem || draggedItem.status === overData.status) {
      return;
    }

    updateItem({
      ...draggedItem,
      status: overData.status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleInlineStatusChange = (item: ProjectItem, nextStatus: ItemStatus) => {
    updateItem({
      ...item,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Item status updated.");
  };

  const handleInlineScheduleChange = (
    item: ProjectItem,
    nextStartDate?: string,
    nextDueDate?: string
  ) => {
    updateItem({
      ...item,
      startDate: nextStartDate,
      dueDate: nextDueDate,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Schedule updated.");
  };

  const handleInlineAssigneeChange = (item: ProjectItem, nextAssigneeIds: string[]) => {
    updateItem({
      ...item,
      assigneeIds: nextAssigneeIds,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Assignees updated.");
  };

  const handleInlineModuleChange = (item: ProjectItem, nextModuleId?: string) => {
    updateItem({
      ...item,
      moduleId: nextModuleId,
      updatedAt: new Date().toISOString(),
    });
    toast.success("Module updated.");
  };

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <Card className="overflow-hidden border shadow-sm">
          <Skeleton className="h-44 w-full rounded-none" />
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-3 md:grid-cols-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardContent className="space-y-3 p-4">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <Card className="border shadow-sm">
        <CardContent className="space-y-3 p-8 text-center">
          <p className="text-base font-medium">Project not found</p>
          <p className="text-sm text-muted-foreground">
            The requested project does not exist in your current workspace.
          </p>
          <Button asChild variant="outline">
            <Link href="/app/projects">Back to Projects</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border shadow-sm">
        <div className="relative h-44 w-full bg-muted/50">
          {project.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={project.coverImage} alt={`${project.title} cover`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(120deg,hsl(var(--muted))_10%,hsl(var(--accent))_90%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary">{project.module}</Badge>
              <Badge variant="outline">{projectItems.length} items</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description ?? "No project description provided yet."}
            </p>
          </div>
        </div>
      </Card>

      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">Modules</CardTitle>
          {canManageModules ? (
            <Button size="sm" onClick={() => setCreateModuleDialogOpen(true)}>
              <Plus className="mr-2 size-4" />
              Create Module
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {projectModules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No modules yet. Create one to organize work.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {projectModules.map((module) => {
                const rootItems = projectItems.filter(
                  (item) => item.moduleId === module.id && !item.parentId
                );
                const progress = calculateModuleProgress(module.id);

                return (
                  <Card key={module.id} className="border">
                    <CardContent className="space-y-3 p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{module.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateRange(module.startDate, module.endDate)}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 w-full rounded bg-muted">
                          <div
                            className="h-2 rounded bg-primary"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">{progress}% complete</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{rootItems.length} root items</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search items..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All Statuses</SelectItem>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Filter priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_FILTER}>All Priorities</SelectItem>
                {PRIORITIES.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {priority}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreateItems ? (
              <Button onClick={handleNewItem} className="w-full lg:w-auto">
                <Plus className="mr-2 size-4" />
                New Item
              </Button>
            ) : (
              <Badge variant="outline" className="w-full justify-center lg:w-auto">
                View-only access
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">
            <Table2 className="size-4" />
            Backlog
          </TabsTrigger>
          <TabsTrigger value="list">
            <List className="size-4" />
            List
          </TabsTrigger>
          <TabsTrigger value="kanban">
            <KanbanSquare className="size-4" />
            Kanban
          </TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card className="overflow-hidden border-border/60 bg-card/70 shadow-sm">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <div className="inline-flex items-center gap-2 text-sm font-medium">
                  <Table2 className="size-4 text-muted-foreground" />
                  Backlog
                </div>
                <div className="flex items-center gap-2">
                  <Popover open={moduleFilterOpen} onOpenChange={setModuleFilterOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 gap-2 rounded-md border-border/60 bg-card/70 px-2.5 text-xs hover:bg-muted/40"
                      >
                        <span className="inline-flex size-4 items-center justify-center rounded border border-border/70 bg-muted/50">
                          <Grid2x2 className="size-3 text-muted-foreground" />
                        </span>
                        <span className="max-w-[150px] truncate">{activeModuleLabel}</span>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-[320px] p-0">
                      <Command>
                        <CommandInput placeholder="Search modules..." />
                        <CommandList>
                          <CommandEmpty>No modules found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="all modules"
                              onSelect={() => {
                                setModuleFilter(ALL_FILTER);
                                setModuleFilterOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="inline-flex size-4 items-center justify-center rounded border border-border/70 bg-muted/50">
                                <Grid2x2 className="size-3 text-muted-foreground" />
                              </span>
                              <span className="flex-1 truncate">All Modules</span>
                              <Check
                                className={`size-3.5 ${moduleFilter === ALL_FILTER ? "opacity-100" : "opacity-0"}`}
                              />
                            </CommandItem>
                            {projectModules.map((module) => (
                              <CommandItem
                                key={module.id}
                                value={module.name}
                                onSelect={() => {
                                  setModuleFilter(module.id);
                                  setModuleFilterOpen(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <span className="inline-flex size-4 items-center justify-center rounded border border-border/70 bg-muted/50">
                                  <Grid2x2 className="size-3 text-muted-foreground" />
                                </span>
                                <span className="flex-1 truncate">{module.name}</span>
                                <Check
                                  className={`size-3.5 ${moduleFilter === module.id ? "opacity-100" : "opacity-0"}`}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Badge variant="outline" className="rounded-full">
                    {filteredItems.length} issues
                  </Badge>
                </div>
              </div>
              {filteredRoots.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/60 bg-muted/15 p-2">
                  <EmptyState
                    icon={ListTodo}
                    title="No items in backlog view"
                    description="Try adjusting filters or create your first project item."
                    actionLabel={canCreateItems ? "New Item" : undefined}
                    onAction={canCreateItems ? handleNewItem : undefined}
                  />
                </div>
              ) : (
                filteredRoots.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    level={0}
                    projectCode={projectCode}
                    projectItems={projectItems}
                    users={users}
                    moduleById={moduleById}
                    usersById={usersById}
                    childrenByParentId={childrenByParentId}
                    expanded={expanded}
                    onToggleExpand={(itemId) =>
                      setExpanded((current) => ({ ...current, [itemId]: !current[itemId] }))
                    }
                    onOpenItem={handleOpenItem}
                    onInlineStatusChange={handleInlineStatusChange}
                    onInlineScheduleChange={handleInlineScheduleChange}
                    onInlineAssigneeChange={handleInlineAssigneeChange}
                    onInlineModuleChange={handleInlineModuleChange}
                    calculateItemProgress={calculateItemProgress}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="list">
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No items in list view"
              description="There are no items matching your search and filters."
            />
          ) : (
            <Card className="overflow-hidden border shadow-sm">
              <CardContent className="p-0">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full cursor-pointer border-b p-4 text-left transition hover:bg-muted/40 last:border-b-0"
                    onClick={() => handleOpenItem(item.id)}
                  >
                    <div className="grid gap-3 xl:grid-cols-[minmax(250px,1.5fr)_repeat(7,minmax(120px,1fr))]">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          {item.ticketId || `${projectCode}-${projectItems.findIndex((candidate) => candidate.id === item.id) + 1}`}
                        </p>
                        <p className="truncate font-medium">{item.title}</p>
                        <p className="line-clamp-1 text-xs text-muted-foreground">
                          {toPlainText(item.description ?? "") || "No item description."}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Status</p>
                        <Badge variant="outline">{item.status}</Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p>
                        <Badge variant="secondary">{item.priority}</Badge>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Assignees</p>
                        {item.assigneeIds.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Unassigned</span>
                        ) : (
                          <AvatarGroup>
                            {item.assigneeIds.slice(0, 3).map((assigneeId) => {
                              const assignee = usersById.get(assigneeId);
                              return (
                                <Tooltip key={assigneeId}>
                                  <TooltipTrigger asChild>
                                    <Avatar size="sm">
                                      <AvatarImage src={assignee?.avatarUrl} />
                                      <AvatarFallback>{getInitials(assignee?.name)}</AvatarFallback>
                                    </Avatar>
                                  </TooltipTrigger>
                                  <TooltipContent>{assignee?.name ?? "Unknown User"}</TooltipContent>
                                </Tooltip>
                              );
                            })}
                            {item.assigneeIds.length > 3 ? (
                              <AvatarGroupCount className="size-6 text-xs">
                                +{item.assigneeIds.length - 3}
                              </AvatarGroupCount>
                            ) : null}
                          </AvatarGroup>
                        )}
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Labels</p>
                        <div className="flex flex-wrap items-center gap-1">
                          {(item.labels ?? []).length === 0 ? (
                            <span className="text-xs text-muted-foreground">No Labels</span>
                          ) : (
                            (item.labels ?? []).map((label) => (
                              <Badge key={label} variant="outline" className={LABEL_COLORS[label as ItemLabel]}>
                                <Tag className="mr-1 size-3" />
                                {label}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Dates</p>
                        <div className="text-xs text-muted-foreground">
                          <p>Start: {formatDate(item.startDate)}</p>
                          <p>Due: {formatDate(item.dueDate)}</p>
                          <p>Created: {formatDate(item.createdAt)}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Module</p>
                        <span className="text-xs">{item.moduleId ? moduleById.get(item.moduleId)?.name ?? "--" : "--"}</span>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Created By</p>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs">
                              <User className="size-3.5 text-muted-foreground" />
                              {getInitials(usersById.get(item.createdBy)?.name)}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            {usersById.get(item.createdBy)?.name ?? "Unknown User"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="kanban">
          <DndContext
            sensors={sensors}
            onDragStart={(event) => {
              const activeData = event.active.data.current as { itemId?: string } | undefined;
              setDraggingItemId(activeData?.itemId ?? null);
            }}
            onDragEnd={handleKanbanDragEnd}
            onDragCancel={() => setDraggingItemId(null)}
          >
            <div className="overflow-x-auto pb-2">
              <div className="grid min-w-[1200px] gap-4 md:grid-cols-2 xl:grid-cols-4">
              {groupedForKanban.map((column) => (
                <KanbanColumn
                  key={column.status}
                  status={column.status}
                  items={column.items}
                  onOpenItem={handleOpenItem}
                  usersById={usersById}
                  modulesById={moduleById}
                />
              ))}
              </div>
            </div>
            <DragOverlay>
              {draggingItemId ? (
                <div className="w-64">
                  <Card className="border bg-card/95 shadow-lg">
                    <CardContent className="space-y-2 p-3">
                      <p className="text-xs text-muted-foreground">
                        {projectItems.find((item) => item.id === draggingItemId)?.ticketId ?? "ITEM"}
                      </p>
                      <p className="text-sm font-medium">
                        {projectItems.find((item) => item.id === draggingItemId)?.title ?? "Item"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TabsContent>
      </Tabs>
      {currentUser ? (
        <CreateItemDialog
          open={newItemDialogOpen}
          projectCode={projectCode}
          existingTicketIds={projectItems.map((item) => item.ticketId).filter(Boolean)}
          projectId={project.id}
          creatorId={currentUser.id}
          modules={projectModules}
          items={projectItems}
          users={users}
          onOpenChange={setNewItemDialogOpen}
          onCreate={handleCreateItem}
        />
      ) : null}
      <CreateModuleDialog
        open={createModuleDialogOpen}
        projectId={project.id}
        onOpenChange={setCreateModuleDialogOpen}
        onCreate={handleCreateModule}
      />
      <ItemSheet
        open={itemSheetOpen}
        item={activeItem}
        role={currentUser?.role ?? null}
        users={users}
        modules={projectModules}
        comments={comments}
        currentUserId={currentUser?.id ?? null}
        onOpenChange={setItemSheetOpen}
        onCreateItem={handleCreateItem}
        onUpdate={updateItem}
        onAddComment={addComment}
        onArchiveItem={archiveItem}
        onDeleteItem={deleteItem}
      />
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleDateString();
}

function formatDateCompact(value?: string) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return "No dates";
  }

  const start = startDate ? formatDate(startDate) : "No start";
  const end = endDate ? formatDate(endDate) : "No end";
  return `${start} - ${end}`;
}

function truncateWithEllipsis(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function toPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getInitials(name?: string) {
  return (
    name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U"
  );
}

function ItemRow({
  item,
  level,
  projectCode,
  projectItems,
  users,
  moduleById,
  usersById,
  childrenByParentId,
  expanded,
  onToggleExpand,
  onOpenItem,
  onInlineStatusChange,
  onInlineScheduleChange,
  onInlineAssigneeChange,
  onInlineModuleChange,
  calculateItemProgress,
}: {
  item: ProjectItem;
  level: number;
  projectCode: string;
  projectItems: ProjectItem[];
  users: DomainUser[];
  moduleById: Map<string, Module>;
  usersById: Map<string, DomainUser>;
  childrenByParentId: Map<string, ProjectItem[]>;
  expanded: Record<string, boolean>;
  onToggleExpand: (itemId: string) => void;
  onOpenItem: (itemId: string) => void;
  onInlineStatusChange: (item: ProjectItem, nextStatus: ItemStatus) => void;
  onInlineScheduleChange: (item: ProjectItem, nextStartDate?: string, nextDueDate?: string) => void;
  onInlineAssigneeChange: (item: ProjectItem, nextAssigneeIds: string[]) => void;
  onInlineModuleChange: (item: ProjectItem, nextModuleId?: string) => void;
  calculateItemProgress: (itemId: string) => number;
}) {
  const children = childrenByParentId.get(item.id) ?? [];
  const hasChildren = children.length > 0;
  const isExpanded = Boolean(expanded[item.id]);
  const progress = calculateItemProgress(item.id);
  const ticketDisplay =
    item.ticketId || `${projectCode}-${projectItems.findIndex((candidate) => candidate.id === item.id) + 1}`;

  return (
    <>
      <div
        className="group rounded-xl border border-border/50 bg-card/40 px-3 py-2 transition hover:border-border hover:bg-muted/30"
        style={{ marginLeft: `${level * 16}px` }}
        onClick={() => onOpenItem(item.id)}
      >
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <div className="pt-0.5">
              {hasChildren ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 rounded-md"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleExpand(item.id);
                  }}
                >
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </Button>
              ) : (
                <span className="inline-flex size-7 items-center justify-center text-muted-foreground/40">
                  <ChevronRight className="size-3.5" />
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground">{ticketDisplay}</p>
              <p className="truncate text-sm font-medium leading-6">{truncateWithEllipsis(item.title, 90)}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
            <div className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2 py-1">
              <div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary/80" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-[11px] text-muted-foreground">{progress}%</span>
            </div>

            <Select value={item.status} onValueChange={(value) => onInlineStatusChange(item, value as ItemStatus)}>
              <SelectTrigger className="h-8 w-[126px] rounded-md border-border/60 bg-muted/30 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="h-8 rounded-full border-border/60 bg-muted/30 px-3 text-xs">
              {item.priority}
            </Badge>

            <InlineAssigneePicker
              users={users}
              usersById={usersById}
              assigneeIds={item.assigneeIds}
              onChange={(nextAssigneeIds) => onInlineAssigneeChange(item, nextAssigneeIds)}
            />

            {(item.labels ?? []).slice(0, 2).map((label) => (
              <Badge
                key={label}
                variant="outline"
                className={`h-8 rounded-full border-border/60 bg-muted/30 px-3 text-xs ${LABEL_COLORS[label as ItemLabel]}`}
              >
                <Tag className="mr-1 size-3" />
                {label}
              </Badge>
            ))}
            {item.labels && item.labels.length > 2 ? (
              <Badge variant="outline" className="h-8 rounded-full border-border/60 bg-muted/30 px-3 text-xs">
                +{item.labels.length - 2}
              </Badge>
            ) : null}

            <InlineModulePicker
              moduleById={moduleById}
              modules={Array.from(moduleById.values())}
              moduleId={item.moduleId ?? undefined}
              onChange={(nextModuleId) => onInlineModuleChange(item, nextModuleId)}
            />

            <DateRangePicker
              startDate={item.startDate}
              dueDate={item.dueDate}
              onChange={(next) => onInlineScheduleChange(item, next.startDate, next.dueDate)}
            />

            <Badge variant="outline" className="h-8 rounded-full border-border/60 bg-muted/30 px-3 text-xs text-muted-foreground">
              {formatDateCompact(item.createdAt) ?? "Created"}
            </Badge>

            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar size="sm">
                  <AvatarImage src={usersById.get(item.createdBy)?.avatarUrl} />
                  <AvatarFallback>{getInitials(usersById.get(item.createdBy)?.name)}</AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{usersById.get(item.createdBy)?.name ?? "Unknown User"}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
      {isExpanded
        ? children.map((child) => (
            <ItemRow
              key={child.id}
              item={child}
              level={level + 1}
              projectCode={projectCode}
              projectItems={projectItems}
              users={users}
              moduleById={moduleById}
              usersById={usersById}
              childrenByParentId={childrenByParentId}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onOpenItem={onOpenItem}
              onInlineStatusChange={onInlineStatusChange}
              onInlineScheduleChange={onInlineScheduleChange}
              onInlineAssigneeChange={onInlineAssigneeChange}
              onInlineModuleChange={onInlineModuleChange}
              calculateItemProgress={calculateItemProgress}
            />
          ))
        : null}
    </>
  );
}

function InlineAssigneePicker({
  users,
  usersById,
  assigneeIds,
  onChange,
}: {
  users: DomainUser[];
  usersById: Map<string, DomainUser>;
  assigneeIds: string[];
  onChange: (nextAssigneeIds: string[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const selectedAssignees = React.useMemo(
    () => assigneeIds.map((id) => usersById.get(id)).filter(Boolean) as DomainUser[],
    [assigneeIds, usersById]
  );

  const toggleAssignee = (userId: string) => {
    if (assigneeIds.includes(userId)) {
      onChange(assigneeIds.filter((id) => id !== userId));
      return;
    }

    onChange([...new Set([...assigneeIds, userId])]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-full border-border/60 bg-muted/30 px-2"
          aria-label="Manage assignees"
        >
          {selectedAssignees.length === 0 ? (
            <Users className="size-3.5 text-muted-foreground" />
          ) : (
            <AvatarGroup>
              {selectedAssignees.slice(0, 2).map((assignee) => (
                <Tooltip key={assignee.id}>
                  <TooltipTrigger asChild>
                    <Avatar size="sm">
                      <AvatarImage src={assignee.avatarUrl} />
                      <AvatarFallback>{getInitials(assignee.name)}</AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{assignee.name}</TooltipContent>
                </Tooltip>
              ))}
              {selectedAssignees.length > 2 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AvatarGroupCount className="size-6 text-xs">
                      +{selectedAssignees.length - 2}
                    </AvatarGroupCount>
                  </TooltipTrigger>
                  <TooltipContent>{selectedAssignees.length} total</TooltipContent>
                </Tooltip>
              ) : null}
            </AvatarGroup>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[290px] p-0">
        <Command>
          <CommandInput placeholder="Search assignees..." />
          <CommandList>
            <CommandEmpty>No users found.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => {
                const isSelected = assigneeIds.includes(user.id);
                return (
                  <CommandItem
                    key={user.id}
                    value={`${user.name} ${user.email}`}
                    onSelect={() => toggleAssignee(user.id)}
                    className="flex items-center gap-2"
                  >
                    <Avatar size="sm">
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{user.name}</span>
                    <Check className={`size-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function InlineModulePicker({
  modules,
  moduleById,
  moduleId,
  onChange,
}: {
  modules: Module[];
  moduleById: Map<string, Module>;
  moduleId?: string;
  onChange: (nextModuleId?: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const activeModule = moduleId ? moduleById.get(moduleId) : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={`h-8 rounded-md border-border/60 bg-muted/30 text-xs hover:bg-muted/40 ${
                activeModule ? "gap-2 px-2.5" : "size-8 p-0"
              }`}
              aria-label={activeModule ? `Module: ${activeModule.name}` : "Assign module"}
            >
              <span className="inline-flex size-4 items-center justify-center rounded border border-border/70 bg-muted/50">
                <Grid2x2 className="size-3 text-muted-foreground" />
              </span>
              {activeModule ? (
                <>
                  <span className="max-w-[120px] truncate">{activeModule.name}</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </>
              ) : null}
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        {!activeModule ? <TooltipContent>Assign module</TooltipContent> : null}
      </Tooltip>
      <PopoverContent align="end" className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search modules..." />
          <CommandList>
            <CommandEmpty>No modules found.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="no module"
                onSelect={() => {
                  onChange(undefined);
                  setOpen(false);
                }}
                className="flex items-center gap-2"
              >
                <span className="inline-flex size-4 items-center justify-center rounded border border-border/70 bg-muted/50">
                  <Grid2x2 className="size-3 text-muted-foreground" />
                </span>
                <span className="flex-1 truncate">No Module</span>
                <Check className={`size-3.5 ${!moduleId ? "opacity-100" : "opacity-0"}`} />
              </CommandItem>
              {modules.map((module) => (
                <CommandItem
                  key={module.id}
                  value={module.name}
                  onSelect={() => {
                    onChange(module.id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="inline-flex size-4 items-center justify-center rounded border border-border/70 bg-muted/50">
                    <Grid2x2 className="size-3 text-muted-foreground" />
                  </span>
                  <span className="flex-1 truncate">{module.name}</span>
                  <Check className={`size-3.5 ${module.id === moduleId ? "opacity-100" : "opacity-0"}`} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function KanbanColumn({
  status,
  items,
  onOpenItem,
  usersById,
  modulesById,
}: {
  status: ItemStatus;
  items: ProjectItem[];
  onOpenItem: (itemId: string) => void;
  usersById: Map<string, DomainUser>;
  modulesById: Map<string, Module>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${status}`,
    data: { type: "column", status },
  });

  return (
    <Card className={`border shadow-sm ${isOver ? "border-primary/60 bg-muted/20" : ""}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold tracking-wide">
          <span className="inline-flex items-center gap-2">
            <span className="size-2 rounded-full bg-primary/70" />
            {status}
          </span>
          <Badge variant="outline">{items.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            Drop item to move into <span className="font-medium">{status}</span>
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              onOpenItem={onOpenItem}
              usersById={usersById}
              moduleName={item.moduleId ? modulesById.get(item.moduleId)?.name ?? "--" : "--"}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function KanbanCard({
  item,
  onOpenItem,
  usersById,
  moduleName,
}: {
  item: ProjectItem;
  onOpenItem: (itemId: string) => void;
  usersById: Map<string, DomainUser>;
  moduleName: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `card-${item.id}`,
    data: { type: "card", status: item.status, itemId: item.id },
  });

  return (
    <Card
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Translate.toString(transform) : undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="cursor-pointer border bg-card/70 transition hover:bg-card"
      onClick={() => {
        if (!isDragging) {
          onOpenItem(item.id);
        }
      }}
      {...listeners}
      {...attributes}
    >
      <CardContent className="space-y-3 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{item.ticketId}</p>
            <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
          </div>
          <GripVertical className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {(item.labels ?? []).slice(0, 2).map((label) => (
            <Badge key={label} variant="outline" className="text-[10px]">
              {label}
            </Badge>
          ))}
          {item.labels && item.labels.length > 2 ? (
            <Badge variant="outline" className="text-[10px]">+{item.labels.length - 2}</Badge>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">{item.priority}</Badge>
          <Badge variant="outline" className="text-[10px]">{moduleName}</Badge>
        </div>

        <div className="flex items-center justify-between">
          {item.assigneeIds.length === 0 ? (
            <span className="text-xs text-muted-foreground">Unassigned</span>
          ) : (
            <AvatarGroup>
              {item.assigneeIds.slice(0, 3).map((assigneeId) => {
                const assignee = usersById.get(assigneeId);
                return (
                  <Tooltip key={assigneeId}>
                    <TooltipTrigger asChild>
                      <Avatar size="sm">
                        <AvatarImage src={assignee?.avatarUrl} />
                        <AvatarFallback>{getInitials(assignee?.name)}</AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{assignee?.name ?? "Unknown User"}</TooltipContent>
                  </Tooltip>
                );
              })}
              {item.assigneeIds.length > 3 ? (
                <AvatarGroupCount className="size-6 text-xs">
                  +{item.assigneeIds.length - 3}
                </AvatarGroupCount>
              ) : null}
            </AvatarGroup>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] text-muted-foreground">
                <User className="size-3" />
                {getInitials(usersById.get(item.createdBy)?.name)}
              </div>
            </TooltipTrigger>
            <TooltipContent>{usersById.get(item.createdBy)?.name ?? "Unknown User"}</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" />
            Start: {formatDate(item.startDate)}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" />
            Due: {formatDate(item.dueDate)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}


