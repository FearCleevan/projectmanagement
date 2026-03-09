"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  CircleDashed,
  Grid2x2,
  Loader2,
  LoaderCircle,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  Save,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import {
  ITEM_LABELS,
  ITEM_STATUSES,
  normalizeItemStatus,
  type Comment,
  type ItemLabel,
  type ItemPriority,
  type ItemStatus,
  type Module,
  type ProjectItem,
  type Role,
  type User,
} from "@/types/domain";
import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog";
import { DateRangePicker } from "@/components/ui-kit/date-range-picker";
import { RichTextEditor } from "@/components/ui-kit/rich-text-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAppStore } from "@/store/app-store";
import { cn } from "@/lib/utils";

const ITEM_PRIORITIES: ItemPriority[] = ["Low", "Medium", "High", "Urgent"];

type ItemSheetProps = {
  open: boolean;
  item: ProjectItem | null;
  role: Role | null;
  users: User[];
  modules: Module[];
  comments: Comment[];
  currentUserId: string | null;
  onOpenChange: (open: boolean) => void;
  onCreateItem: (item: ProjectItem) => void;
  onUpdate: (item: ProjectItem) => void | Promise<void>;
  onAddComment: (comment: Comment) => void;
  onArchiveItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
};

export function ItemSheet({
  open,
  item,
  role,
  users,
  modules,
  comments,
  currentUserId,
  onOpenChange,
  onCreateItem,
  onUpdate,
  onAddComment,
  onArchiveItem,
  onDeleteItem,
}: ItemSheetProps) {
  const [draft, setDraft] = React.useState<ProjectItem | null>(item);
  const [newComment, setNewComment] = React.useState("");
  const isMember = role === "MEMBER";
  const canEditFull = role === "OWNER" || role === "ADMIN";
  const canManageSubWork = canEditFull || isMember;
  const [itemActionDialogOpen, setItemActionDialogOpen] = React.useState(false);
  const [pendingItemAction, setPendingItemAction] = React.useState<"archive" | "delete" | null>(null);
  const [subWorkTitle, setSubWorkTitle] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [parentPickerOpen, setParentPickerOpen] = React.useState(false);
  const [modulePickerOpen, setModulePickerOpen] = React.useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = React.useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = React.useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = React.useState(false);
  const allItems = useAppStore((state) => state.items);
  const getChildItems = useAppStore((state) => state.getChildItems);
  const calculateItemProgress = useAppStore((state) => state.calculateItemProgress);

  React.useEffect(() => {
    setDraft(item);
    setNewComment("");
    setSubWorkTitle("");
    setStatusPickerOpen(false);
    setParentPickerOpen(false);
    setModulePickerOpen(false);
    setPriorityPickerOpen(false);
    setAssigneePickerOpen(false);
    setLabelPickerOpen(false);
  }, [item, open]);

  const itemComments = React.useMemo(() => {
    if (!item) {
      return [];
    }

    return comments
      .filter((comment) => comment.itemId === item.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [comments, item]);

  const childItems = React.useMemo(() => {
    if (!item) {
      return [];
    }

    return getChildItems(item.id);
  }, [getChildItems, item]);

  const parentCandidates = React.useMemo(() => {
    if (!draft) {
      return [];
    }

    return allItems.filter(
      (candidate) =>
        candidate.projectId === draft.projectId &&
        !candidate.archived &&
        candidate.parentId == null &&
        candidate.id !== draft.id
    );
  }, [allItems, draft]);

  const selectedParent = React.useMemo(
    () => parentCandidates.find((candidate) => candidate.id === draft?.parentId) ?? null,
    [draft?.parentId, parentCandidates]
  );

  const updateDraft = (patch: Partial<ProjectItem>) => {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  };

  const toggleAssignee = (userId: string, checked: boolean) => {
    if (!draft || !canEditFull) {
      return;
    }

    if (checked) {
      updateDraft({ assigneeIds: [...new Set([...draft.assigneeIds, userId])] });
      return;
    }

    updateDraft({ assigneeIds: draft.assigneeIds.filter((id) => id !== userId) });
  };

  const toggleLabel = (label: ItemLabel, checked: boolean) => {
    if (!draft || !canEditFull) {
      return;
    }

    if (checked) {
      updateDraft({ labels: [...new Set([...(draft.labels ?? []), label])] });
      return;
    }

    updateDraft({ labels: (draft.labels ?? []).filter((value) => value !== label) });
  };

  const handleSave = async () => {
    if (!draft || !item) {
      return;
    }

    if (!draft.title.trim()) {
      toast.error("Item title is required.");
      return;
    }

    const now = new Date().toISOString();

    try {
      setIsSaving(true);

      if (isMember) {
        await Promise.resolve(
          onUpdate({
            ...item,
            status: draft.status,
            updatedAt: now,
          })
        );
        toast.success("Status updated.");
        onOpenChange(false);
        return;
      }

      await Promise.resolve(
        onUpdate({
          ...draft,
          title: draft.title.trim(),
          description: toPlainText(draft.description ?? "").trim() ? draft.description : undefined,
          updatedAt: now,
        })
      );
      toast.success("Item updated.");
      onOpenChange(false);
    } catch {
      toast.error("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddComment = () => {
    if (!item || !currentUserId) {
      return;
    }

    if (!toPlainText(newComment).trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }

    const now = new Date().toISOString();
    const generatedId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `comment-${Date.now()}`;

    onAddComment({
      id: generatedId,
      itemId: item.id,
      authorId: currentUserId,
      content: newComment,
      createdAt: now,
    });
    setNewComment("");
    toast.success("Comment added.");
  };

  const handleConfirmItemAction = () => {
    if (!item || !pendingItemAction) {
      return;
    }

    if (pendingItemAction === "archive") {
      onArchiveItem(item.id);
      toast.success("Item archived.");
    } else {
      onDeleteItem(item.id);
      toast.success("Item deleted.");
    }

    onOpenChange(false);
  };

  const handleQuickAddSubWork = () => {
    if (!item || !currentUserId) {
      return;
    }

    if (!subWorkTitle.trim()) {
      toast.error("Sub-work title is required.");
      return;
    }

    const now = new Date().toISOString();
    const generatedId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `item-${Date.now()}`;
    const nextChildIndex = childItems.length + 1;

    onCreateItem({
      id: generatedId,
      ticketId: `${item.ticketId}.${nextChildIndex}`,
      projectId: item.projectId,
      moduleId: item.moduleId ?? null,
      parentId: item.id,
      title: subWorkTitle.trim(),
      description: undefined,
      status: "TODO",
      priority: item.priority,
      assigneeIds: [],
      labelIds: [],
      labels: [],
      archived: false,
      createdBy: currentUserId,
      createdAt: now,
      updatedAt: now,
    });

    setSubWorkTitle("");
    toast.success("Sub-work item created.");
  };

  const handleToggleChildDone = (child: ProjectItem, checked: boolean) => {
    onUpdate({
      ...child,
      status: checked ? "DONE" : "TODO",
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden sm:max-w-[50vw]">
        <SheetHeader className="px-6 pt-6">
          <div className="flex items-start justify-between gap-3">
            <SheetTitle>Item Details</SheetTitle>
            {canEditFull && item ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setPendingItemAction("archive");
                      setItemActionDialogOpen(true);
                    }}
                  >
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setPendingItemAction("delete");
                      setItemActionDialogOpen(true);
                    }}
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <SheetDescription>
            {isMember
              ? "Member access: update status and add comments."
              : "Update details, assignees, and schedule for this item."}
          </SheetDescription>
        </SheetHeader>

        {!draft ? (
          <div className="p-6 text-sm text-muted-foreground">Select an item to view details.</div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 px-6">
            <div className="space-y-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="item-title">Title</Label>
                <Input
                  id="item-title"
                  value={draft.title}
                  onChange={(event) => updateDraft({ title: event.target.value })}
                  disabled={!canEditFull}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-ticket">Ticket ID</Label>
                <Input id="item-ticket" value={draft.ticketId} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <RichTextEditor
                  value={draft.description ?? ""}
                  onChange={(value) => updateDraft({ description: value })}
                  readOnly={!canEditFull}
                  placeholder="Add a short description..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Popover open={statusPickerOpen} onOpenChange={setStatusPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-9 w-full justify-between rounded-md text-xs font-normal hover:bg-muted/40",
                          getStatusStyle(draft.status).borderClass,
                          getStatusStyle(draft.status).bgClass
                        )}
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          {(() => {
                            const style = getStatusStyle(draft.status);
                            const Icon = style.icon;
                            return (
                              <>
                                <Icon className={cn("size-3.5", style.textClass)} />
                                {getStatusLabel(draft.status)}
                              </>
                            );
                          })()}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[320px] p-0">
                      <Command>
                        <CommandInput placeholder="Search status..." />
                        <CommandList>
                          <CommandEmpty>No status found.</CommandEmpty>
                          <CommandGroup>
                            {ITEM_STATUSES.map((status) => {
                              const style = getStatusStyle(status);
                              const Icon = style.icon;
                              return (
                                <CommandItem
                                  key={status}
                                  value={getStatusLabel(status)}
                                  onSelect={() => {
                                    updateDraft({ status: status as ItemStatus });
                                    setStatusPickerOpen(false);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Icon className={cn("size-3.5", style.textClass)} />
                                  <span className="flex-1 truncate">{getStatusLabel(status)}</span>
                                  <Check
                                    className={cn(
                                      "size-3.5",
                                      normalizeItemStatus(draft.status) === normalizeItemStatus(status)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Parent Item</Label>
                  <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEditFull}
                        className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                      >
                        <span className="truncate">
                          {selectedParent ? `${selectedParent.ticketId} - ${selectedParent.title}` : "No Parent"}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[420px] p-0">
                      <Command>
                        <CommandInput placeholder="Search parent items..." />
                        <CommandList>
                          <CommandEmpty>No parent items found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="no parent"
                              onSelect={() => {
                                if (!canEditFull) {
                                  return;
                                }
                                updateDraft({ parentId: null });
                                setParentPickerOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              <span className="flex-1 truncate">No Parent</span>
                              <Check
                                className={cn("size-3.5", !draft.parentId ? "opacity-100" : "opacity-0")}
                              />
                            </CommandItem>
                            {parentCandidates.map((parent) => (
                              <CommandItem
                                key={parent.id}
                                value={`${parent.ticketId} ${parent.title}`}
                                onSelect={() => {
                                  if (!canEditFull) {
                                    return;
                                  }
                                  updateDraft({ parentId: parent.id });
                                  setParentPickerOpen(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <span className="flex-1 truncate">{parent.ticketId} - {parent.title}</span>
                                <Check
                                  className={cn(
                                    "size-3.5",
                                    draft.parentId === parent.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Popover open={modulePickerOpen} onOpenChange={setModulePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEditFull}
                        className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          <Grid2x2 className="size-3.5 text-muted-foreground" />
                          {modules.find((module) => module.id === draft.moduleId)?.name ?? "No Module"}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[320px] p-0">
                      <Command>
                        <CommandInput placeholder="Search modules..." />
                        <CommandList>
                          <CommandEmpty>No modules found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="no module"
                              onSelect={() => {
                                if (!canEditFull) {
                                  return;
                                }
                                updateDraft({ moduleId: null });
                                setModulePickerOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              <Grid2x2 className="size-3.5 text-muted-foreground" />
                              <span className="flex-1 truncate">No Module</span>
                              <Check
                                className={cn("size-3.5", !draft.moduleId ? "opacity-100" : "opacity-0")}
                              />
                            </CommandItem>
                            {modules.map((module) => (
                              <CommandItem
                                key={module.id}
                                value={module.name}
                                onSelect={() => {
                                  if (!canEditFull) {
                                    return;
                                  }
                                  updateDraft({ moduleId: module.id });
                                  setModulePickerOpen(false);
                                }}
                                className="flex items-center gap-2"
                              >
                                <Grid2x2 className="size-3.5 text-muted-foreground" />
                                <span className="flex-1 truncate">{module.name}</span>
                                <Check
                                  className={cn(
                                    "size-3.5",
                                    draft.moduleId === module.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Popover open={priorityPickerOpen} onOpenChange={setPriorityPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!canEditFull}
                        className={cn(
                          "h-9 w-full justify-between rounded-md text-xs font-normal hover:bg-muted/40",
                          getPriorityStyle(draft.priority).borderClass,
                          getPriorityStyle(draft.priority).bgClass
                        )}
                      >
                        <span className="inline-flex items-center gap-2 truncate">
                          {(() => {
                            const style = getPriorityStyle(draft.priority);
                            const Icon = style.icon;
                            return (
                              <>
                                <Icon className={cn("size-3.5", style.textClass)} />
                                {draft.priority}
                              </>
                            );
                          })()}
                        </span>
                        <ChevronDown className="size-3 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-[280px] p-0">
                      <Command>
                        <CommandInput placeholder="Search priority..." />
                        <CommandList>
                          <CommandEmpty>No priority found.</CommandEmpty>
                          <CommandGroup>
                            {ITEM_PRIORITIES.map((priority) => {
                              const style = getPriorityStyle(priority);
                              const Icon = style.icon;
                              return (
                                <CommandItem
                                  key={priority}
                                  value={priority}
                                  onSelect={() => {
                                    if (!canEditFull) {
                                      return;
                                    }
                                    updateDraft({ priority });
                                    setPriorityPickerOpen(false);
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Icon className={cn("size-3.5", style.textClass)} />
                                  <span className="flex-1 truncate">{priority}</span>
                                  <Check
                                    className={cn(
                                      "size-3.5",
                                      draft.priority === priority ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignees</Label>
                <Popover open={assigneePickerOpen} onOpenChange={setAssigneePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canEditFull}
                      className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <Users className="size-3.5 text-muted-foreground" />
                        {draft.assigneeIds.length === 0
                          ? "Select assignees"
                          : `${draft.assigneeIds.length} selected`}
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[320px] p-0">
                    <Command>
                      <CommandInput placeholder="Search assignees..." />
                      <CommandList>
                        <CommandEmpty>No users found.</CommandEmpty>
                        <CommandGroup>
                          {users.map((user) => {
                            const isSelected = draft.assigneeIds.includes(user.id);
                            return (
                              <CommandItem
                                key={user.id}
                                value={`${user.name} ${user.email}`}
                                onSelect={() => {
                                  if (!canEditFull) {
                                    return;
                                  }
                                  toggleAssignee(user.id, !isSelected);
                                }}
                                className="flex items-center gap-2"
                              >
                                <span className="flex-1 truncate">{user.name}</span>
                                <Check className={cn("size-3.5", isSelected ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {draft.assigneeIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {users
                      .filter((user) => draft.assigneeIds.includes(user.id))
                      .map((user) => (
                        <Badge key={user.id} variant="secondary" className="font-normal">
                          {user.name}
                        </Badge>
                      ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Labels</Label>
                <Popover open={labelPickerOpen} onOpenChange={setLabelPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canEditFull}
                      className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                    >
                      <span className="inline-flex items-center gap-2 truncate">
                        <Tag className="size-3.5 text-muted-foreground" />
                        {(draft.labels ?? []).length === 0 ? "Select labels" : `${(draft.labels ?? []).length} selected`}
                      </span>
                      <ChevronDown className="size-3 text-muted-foreground" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[320px] p-0">
                    <Command>
                      <CommandInput placeholder="Search labels..." />
                      <CommandList>
                        <CommandEmpty>No labels found.</CommandEmpty>
                        <CommandGroup>
                          {ITEM_LABELS.map((label) => {
                            const isSelected = (draft.labels ?? []).includes(label);
                            return (
                              <CommandItem
                                key={label}
                                value={label}
                                onSelect={() => {
                                  if (!canEditFull) {
                                    return;
                                  }
                                  toggleLabel(label, !isSelected);
                                }}
                                className="flex items-center gap-2"
                              >
                                <span className="flex-1 truncate">{label}</span>
                                <Check className={cn("size-3.5", isSelected ? "opacity-100" : "opacity-0")} />
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {(draft.labels ?? []).length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {(draft.labels ?? []).map((label) => (
                      <Badge key={label} variant="outline" className="font-normal">
                        {label}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label>Schedule</Label>
                <DateRangePicker
                  startDate={draft.startDate}
                  dueDate={draft.dueDate}
                  disabled={!canEditFull}
                  onChange={(next) =>
                    updateDraft({
                      startDate: next.startDate,
                      dueDate: next.dueDate,
                    })
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="inline-flex items-center gap-1">
                    <MessageSquareText className="size-4" />
                    Comments
                  </Label>
                  <Badge variant="outline">{itemComments.length}</Badge>
                </div>
                <div className="space-y-2">
                  <RichTextEditor
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Add a comment..."
                  />
                  <Button onClick={handleAddComment} size="sm">
                    Add Comment
                  </Button>
                </div>
                <ScrollArea className="h-44 rounded-md border p-2">
                  <div className="space-y-2">
                    {itemComments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet.</p>
                    ) : (
                      itemComments.map((comment) => {
                        const author = users.find((user) => user.id === comment.authorId);
                        return (
                          <CardComment
                            key={comment.id}
                            authorName={author?.name ?? "Unknown User"}
                            createdAt={comment.createdAt}
                            content={comment.content}
                          />
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Sub-Work Items</Label>
                  <Badge variant="outline">{childItems.length}</Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="+ Add sub-work item"
                      value={subWorkTitle}
                      onChange={(event) => setSubWorkTitle(event.target.value)}
                      disabled={!canManageSubWork}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleQuickAddSubWork}
                      disabled={!canManageSubWork}
                    >
                      Add
                    </Button>
                  </div>
                  <div className="space-y-2 rounded-md border p-2">
                    {childItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No sub-work items yet.</p>
                    ) : (
                      childItems.map((child) => {
                        const hasNestedChildren = getChildItems(child.id).length > 0;
                        const progress = hasNestedChildren ? calculateItemProgress(child.id) : 0;

                        return (
                          <div
                            key={child.id}
                            className="space-y-2 rounded border bg-muted/20 px-2 py-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  checked={normalizeItemStatus(child.status) === "DONE"}
                                  onCheckedChange={(checked) =>
                                    handleToggleChildDone(child, checked === true)
                                  }
                                  disabled={!canManageSubWork}
                                />
                                <span className="text-sm font-medium">{child.title}</span>
                              </div>
                              <Badge variant="outline">{child.status}</Badge>
                            </div>
                            {hasNestedChildren ? (
                              <div className="space-y-1">
                                <div className="h-1.5 w-full rounded bg-muted">
                                  <div
                                    className="h-1.5 rounded bg-primary"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                  Progress: {progress}%
                                </p>
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        )}

        <SheetFooter className="px-6 pb-6">
          <Button onClick={handleSave} disabled={!draft || isSaving}>
            {isSaving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
      <ConfirmDialog
        open={itemActionDialogOpen}
        title={pendingItemAction === "delete" ? "Delete this item?" : "Archive this item?"}
        description={
          pendingItemAction === "delete"
            ? "This will permanently remove the item and its comments."
            : "Archived items are hidden from active item lists."
        }
        confirmLabel={pendingItemAction === "delete" ? "Delete" : "Archive"}
        onOpenChange={setItemActionDialogOpen}
        onConfirm={handleConfirmItemAction}
      />
    </Sheet>
  );
}

function getStatusLabel(status: ItemStatus) {
  switch (normalizeItemStatus(status)) {
    case "BACKLOG":
      return "Backlog";
    case "TODO":
      return "Todo";
    case "IN_PROGRESS":
      return "In Progress";
    case "DONE":
      return "Done";
    case "BACK_TO_DEV":
      return "Back to Dev";
    case "BACK_TO_DESIGN":
      return "Back to Design";
    default:
      return "Backlog";
  }
}

function getStatusStyle(status: ItemStatus) {
  switch (normalizeItemStatus(status)) {
    case "BACKLOG":
      return {
        icon: CircleDashed,
        textClass: "text-slate-400",
        borderClass: "border-slate-400/40",
        bgClass: "bg-slate-500/10",
      };
    case "TODO":
      return {
        icon: Circle,
        textClass: "text-slate-300",
        borderClass: "border-slate-300/40",
        bgClass: "bg-slate-500/10",
      };
    case "IN_PROGRESS":
      return {
        icon: LoaderCircle,
        textClass: "text-amber-500",
        borderClass: "border-amber-500/40",
        bgClass: "bg-amber-500/10",
      };
    case "DONE":
      return {
        icon: CheckCircle2,
        textClass: "text-emerald-500",
        borderClass: "border-emerald-500/40",
        bgClass: "bg-emerald-500/10",
      };
    default:
      return {
        icon: XCircle,
        textClass: "text-slate-400",
        borderClass: "border-slate-400/40",
        bgClass: "bg-slate-500/10",
      };
  }
}

function getPriorityStyle(priority: ItemPriority) {
  switch (priority) {
    case "Urgent":
      return {
        icon: AlertTriangle,
        textClass: "text-red-500",
        borderClass: "border-red-500/40",
        bgClass: "bg-red-500/10",
      };
    case "High":
      return {
        icon: ArrowUp,
        textClass: "text-orange-500",
        borderClass: "border-orange-500/40",
        bgClass: "bg-orange-500/10",
      };
    case "Medium":
      return {
        icon: Minus,
        textClass: "text-amber-500",
        borderClass: "border-amber-500/40",
        bgClass: "bg-amber-500/10",
      };
    case "Low":
      return {
        icon: ArrowDown,
        textClass: "text-blue-500",
        borderClass: "border-blue-500/40",
        bgClass: "bg-blue-500/10",
      };
    default:
      return {
        icon: Minus,
        textClass: "text-muted-foreground",
        borderClass: "border-border/60",
        bgClass: "bg-muted/30",
      };
  }
}

function CardComment({
  authorName,
  createdAt,
  content,
}: {
  authorName: string;
  createdAt: string;
  content: string;
}) {
  return (
    <div className="rounded-md border p-2">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-xs font-medium">{authorName}</p>
        <p className="text-xs text-muted-foreground">{new Date(createdAt).toLocaleString()}</p>
      </div>
      <div
        className="prose prose-sm max-w-none text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_img]:my-2 [&_img]:max-h-64 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </div>
  );
}

function toPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
