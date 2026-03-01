"use client";

import Link from "next/link";
import * as React from "react";
import { useParams } from "next/navigation";
import {
  CalendarDays,
  GripVertical,
  KanbanSquare,
  List,
  ListTodo,
  Plus,
  Search,
  Table2,
  Tag,
  User,
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

import { CreateItemDialog } from "@/components/ui-kit/create-item-dialog";
import { EmptyState } from "@/components/ui-kit/empty-state";
import { ItemSheet } from "@/components/ui-kit/item-sheet";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useAppStore } from "@/store/app-store";
import {
  ITEM_STATUSES,
  type ItemLabel,
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
  const items = useAppStore((state) => state.items);
  const users = useAppStore((state) => state.users);
  const comments = useAppStore((state) => state.comments);
  const addItem = useAppStore((state) => state.addItem);
  const archiveItem = useAppStore((state) => state.archiveItem);
  const deleteItem = useAppStore((state) => state.deleteItem);
  const updateItem = useAppStore((state) => state.updateItem);
  const addComment = useAppStore((state) => state.addComment);

  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>(ALL_FILTER);
  const [priorityFilter, setPriorityFilter] = React.useState<string>(ALL_FILTER);
  const [newItemDialogOpen, setNewItemDialogOpen] = React.useState(false);
  const [itemSheetOpen, setItemSheetOpen] = React.useState(false);
  const [activeItemId, setActiveItemId] = React.useState<string | null>(null);
  const [draggingItemId, setDraggingItemId] = React.useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const project = React.useMemo(
    () => projects.find((candidate) => candidate.id === projectId),
    [projectId, projects]
  );

  const canCreateItems = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";

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

      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, projectItems, query, statusFilter]);

  const groupedForKanban = React.useMemo(() => {
    return STATUSES.map((status) => ({
      status,
      items: filteredItems.filter((item) => item.status === status),
    }));
  }, [filteredItems]);

  const usersById = React.useMemo(
    () => new Map(users.map((user) => [user.id, user])),
    [users]
  );

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

    addItem(item);
    toast.success("Item created.");
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
            Table
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
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={ListTodo}
              title="No items in table view"
              description="Try adjusting filters or create your first project item."
              actionLabel={canCreateItems ? "New Item" : undefined}
              onAction={canCreateItems ? handleNewItem : undefined}
            />
          ) : (
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Work Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Assignees</TableHead>
                      <TableHead>Labels</TableHead>
                      <TableHead>Modules</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Created On</TableHead>
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow
                        key={item.id}
                        className="cursor-pointer"
                        onClick={() => handleOpenItem(item.id)}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {item.ticketId || `${projectCode}-${projectItems.findIndex((candidate) => candidate.id === item.id) + 1}`}
                            </p>
                            <p className="font-medium">{item.title}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div onClick={(event) => event.stopPropagation()}>
                            <Select
                              value={item.status}
                              onValueChange={(value) =>
                                handleInlineStatusChange(item, value as ItemStatus)
                              }
                            >
                              <SelectTrigger className="h-8 w-[150px]">
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
                          </div>
                        </TableCell>
                        <TableCell>{item.priority}</TableCell>
                        <TableCell>
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
                                        <AvatarFallback>
                                          {getInitials(assignee?.name)}
                                        </AvatarFallback>
                                      </Avatar>
                                    </TooltipTrigger>
                                    <TooltipContent>{assignee?.name ?? "Unknown User"}</TooltipContent>
                                  </Tooltip>
                                );
                              })}
                              {item.assigneeIds.length > 3 ? (
                                <AvatarGroupCount className="size-6 text-xs">+{item.assigneeIds.length - 3}</AvatarGroupCount>
                              ) : null}
                            </AvatarGroup>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            {(item.labels ?? []).length === 0 ? (
                              <span className="text-xs text-muted-foreground">No Labels</span>
                            ) : (
                              (item.labels ?? []).map((label) => (
                                <Badge
                                  key={label}
                                  variant="outline"
                                  className={LABEL_COLORS[label as ItemLabel]}
                                >
                                  <Tag className="mr-1 size-3" />
                                  {label}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{project.module}</TableCell>
                        <TableCell>{formatDate(item.startDate)}</TableCell>
                        <TableCell>{formatDate(item.dueDate)}</TableCell>
                        <TableCell>{formatDate(item.createdAt)}</TableCell>
                        <TableCell>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
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
                        <span className="text-xs">{project.module}</span>
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
                  moduleName={project.module}
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
          users={users}
          onOpenChange={setNewItemDialogOpen}
          onCreate={handleCreateItem}
        />
      ) : null}
      <ItemSheet
        open={itemSheetOpen}
        item={activeItem}
        role={currentUser?.role ?? null}
        users={users}
        comments={comments}
        currentUserId={currentUser?.id ?? null}
        onOpenChange={setItemSheetOpen}
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

function KanbanColumn({
  status,
  items,
  onOpenItem,
  usersById,
  moduleName,
}: {
  status: ItemStatus;
  items: ProjectItem[];
  onOpenItem: (itemId: string) => void;
  usersById: Map<string, DomainUser>;
  moduleName: string;
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
              moduleName={moduleName}
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
