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
  Link2,
  LoaderCircle,
  MessageSquareText,
  Minus,
  MoreHorizontal,
  Paperclip,
  Plus,
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const [subWorkTitle, setSubWorkTitle] = React.useState("");
  const [itemActionDialogOpen, setItemActionDialogOpen] = React.useState(false);
  const [pendingItemAction, setPendingItemAction] = React.useState<"archive" | "delete" | null>(null);
  const [openPickers, setOpenPickers] = React.useState<Record<string, boolean>>({});

  const allItems = useAppStore((state) => state.items);
  const getChildItems = useAppStore((state) => state.getChildItems);
  const calculateItemProgress = useAppStore((state) => state.calculateItemProgress);

  const isMember = role === "MEMBER";
  const canEditFull = role === "OWNER" || role === "ADMIN";
  const canEditStatus = canEditFull || isMember;
  const canManageSubWork = canEditFull || isMember;

  React.useEffect(() => {
    setDraft(item);
    setNewComment("");
    setSubWorkTitle("");
    setOpenPickers({});
  }, [item, open]);

  const itemComments = React.useMemo(
    () =>
      item
        ? comments
            .filter((comment) => comment.itemId === item.id)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        : [],
    [comments, item]
  );

  const childItems = React.useMemo(() => (item ? getChildItems(item.id) : []), [getChildItems, item]);
  const doneSubWorkCount = React.useMemo(
    () => childItems.filter((child) => normalizeItemStatus(child.status) === "DONE").length,
    [childItems]
  );
  const parentCandidates = React.useMemo(
    () =>
      draft
        ? allItems.filter(
            (candidate) =>
              candidate.projectId === draft.projectId &&
              !candidate.archived &&
              candidate.parentId == null &&
              candidate.id !== draft.id
          )
        : [],
    [allItems, draft]
  );

  const selectedParent = React.useMemo(
    () => parentCandidates.find((candidate) => candidate.id === draft?.parentId) ?? null,
    [draft?.parentId, parentCandidates]
  );
  const selectedModule = React.useMemo(
    () => modules.find((module) => module.id === draft?.moduleId) ?? null,
    [draft?.moduleId, modules]
  );
  const selectedAssignees = React.useMemo(
    () => users.filter((user) => draft?.assigneeIds.includes(user.id)),
    [draft?.assigneeIds, users]
  );
  const creator = React.useMemo(
    () => users.find((user) => user.id === draft?.createdBy) ?? null,
    [draft?.createdBy, users]
  );

  const activityEntries = React.useMemo(() => {
    if (!draft) return [];
    const createdBy = users.find((user) => user.id === draft.createdBy)?.name ?? "Unknown User";
    return [
      {
        id: `created-${draft.id}`,
        createdAt: draft.createdAt,
        content: `${createdBy} created this work item.`,
        isComment: false as const,
      },
      ...itemComments.map((comment) => ({
        id: comment.id,
        createdAt: comment.createdAt,
        content: comment.content,
        author: users.find((user) => user.id === comment.authorId)?.name ?? "Unknown User",
        isComment: true as const,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [draft, itemComments, users]);

  const persistPatch = React.useCallback(
    async (patch: Partial<ProjectItem>) => {
      if (!draft || !item) return;
      let safePatch: Partial<ProjectItem> = patch;
      if (!canEditFull && canEditStatus) safePatch = patch.status ? { status: patch.status } : {};
      if (Object.keys(safePatch).length === 0) return;

      const previous = draft;
      const next: ProjectItem = { ...draft, ...safePatch, updatedAt: new Date().toISOString() };
      setDraft(next);
      try {
        await Promise.resolve(onUpdate(next));
      } catch {
        setDraft(previous);
        toast.error("Failed to update item.");
      }
    },
    [canEditFull, canEditStatus, draft, item, onUpdate]
  );

  const toggleAssignee = (userId: string) => {
    if (!draft || !canEditFull) return;
    const next = draft.assigneeIds.includes(userId)
      ? draft.assigneeIds.filter((id) => id !== userId)
      : [...new Set([...draft.assigneeIds, userId])];
    void persistPatch({ assigneeIds: next });
  };

  const toggleLabel = (label: ItemLabel) => {
    if (!draft || !canEditFull) return;
    const labels = draft.labels ?? [];
    const next = labels.includes(label) ? labels.filter((v) => v !== label) : [...new Set([...labels, label])];
    void persistPatch({ labels: next });
  };

  const handleQuickAddSubWork = () => {
    if (!item || !currentUserId) return;
    if (!subWorkTitle.trim()) {
      toast.error("Sub-work title is required.");
      return;
    }
    const now = new Date().toISOString();
    onCreateItem({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `item-${Date.now()}`,
      ticketId: `${item.ticketId}.${childItems.length + 1}`,
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

  const handleAddComment = () => {
    if (!item || !currentUserId) return;
    if (!toPlainText(newComment).trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }
    onAddComment({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `comment-${Date.now()}`,
      itemId: item.id,
      authorId: currentUserId,
      content: newComment,
      createdAt: new Date().toISOString(),
    });
    setNewComment("");
    toast.success("Comment added.");
  };

  const handleConfirmItemAction = () => {
    if (!item || !pendingItemAction) return;
    if (pendingItemAction === "archive") {
      onArchiveItem(item.id);
      toast.success("Item archived.");
    } else {
      onDeleteItem(item.id);
      toast.success("Item deleted.");
    }
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-hidden bg-background sm:max-w-[52vw]">
        <SheetHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-sm text-muted-foreground">Work Item Details</SheetTitle>
              <SheetDescription className="sr-only">Issue detail view</SheetDescription>
              <Input
                value={draft?.title ?? ""}
                disabled={!canEditFull}
                onChange={(event) => setDraft((current) => (current ? { ...current, title: event.target.value } : current))}
                onBlur={() => {
                  if (!draft || !item || !canEditFull) return;
                  if (!draft.title.trim()) {
                    toast.error("Item title is required.");
                    setDraft((current) => (current ? { ...current, title: item.title } : current));
                    return;
                  }
                  if (draft.title.trim() !== item.title.trim()) void persistPatch({ title: draft.title.trim() });
                }}
                className="h-auto border-0 bg-transparent px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
              />
            </div>
            {canEditFull && item ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="size-8">
                    <MoreHorizontal className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setPendingItemAction("archive"); setItemActionDialogOpen(true); }}>Archive</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => { setPendingItemAction("delete"); setItemActionDialogOpen(true); }}>Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => void handleQuickAddSubWork()} disabled={!canManageSubWork}><Plus className="mr-1.5 size-4" />Add sub-work item</Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Add relation is not configured yet.")}><Link2 className="mr-1.5 size-4" />Add relation</Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Add link is not configured yet.")}><Link2 className="mr-1.5 size-4" />Add link</Button>
            <Button size="sm" variant="outline" onClick={() => toast.info("Attachment flow is not configured yet.")}><Paperclip className="mr-1.5 size-4" />Attach</Button>
          </div>
        </SheetHeader>

        {!draft ? (
          <div className="p-6 text-sm text-muted-foreground">Select an item to view details.</div>
        ) : (
          <ScrollArea className="min-h-0 flex-1 px-6 py-4">
            <div className="space-y-6">
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Description</h3>
                <div className="rounded-md">
                  <RichTextEditor
                    value={draft.description ?? ""}
                    onChange={(value) => {
                      setDraft((current) => (current ? { ...current, description: value } : current));
                      if (canEditFull) {
                        const nextDescription = toPlainText(value).trim() ? value : undefined;
                        void persistPatch({ description: nextDescription });
                      }
                    }}
                    readOnly={!canEditFull}
                    placeholder="Add a description..."
                  />
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Sub-work items</h3>
                  <p className="text-sm text-muted-foreground">{doneSubWorkCount}/{childItems.length} Done</p>
                </div>
                <div className="rounded-md border">
                  {childItems.length === 0 ? (
                    <p className="p-3 text-sm text-muted-foreground">No sub-work items yet.</p>
                  ) : childItems.map((child) => {
                    const isDone = normalizeItemStatus(child.status) === "DONE";
                    const progress = getChildItems(child.id).length > 0 ? calculateItemProgress(child.id) : 0;
                    return (
                      <div key={child.id} className="grid grid-cols-[130px_1fr_auto_auto_auto] items-center gap-2 border-b px-3 py-2 text-sm last:border-b-0">
                        <span className="text-muted-foreground">{child.ticketId}</span>
                        <div className="min-w-0"><p className="truncate">{child.title}</p>{progress > 0 ? <p className="text-xs text-muted-foreground">{progress}% nested progress</p> : null}</div>
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => onUpdate({ ...child, status: isDone ? "TODO" : "DONE", updatedAt: new Date().toISOString() })} disabled={!canManageSubWork}><Check className={cn("mr-1 size-3.5", isDone ? "opacity-100" : "opacity-30")} />{isDone ? "Done" : "Todo"}</Button>
                        <span className="text-xs text-muted-foreground">{formatDate(child.dueDate)}</span>
                        <Button type="button" size="icon" variant="ghost" className="size-7" disabled><MoreHorizontal className="size-3.5" /></Button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="+ Add sub-work item" value={subWorkTitle} onChange={(event) => setSubWorkTitle(event.target.value)} disabled={!canManageSubWork} className="h-9" />
                  <Button type="button" size="sm" onClick={handleQuickAddSubWork} disabled={!canManageSubWork}>Add</Button>
                </div>
              </section>

              <Separator />

              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Properties</h3>
                <div className="divide-y rounded-md border">
                  <PropertyRow label="State"><StatusPicker value={draft.status} disabled={!canEditStatus} open={openPickers.status} onOpenChange={(open) => setOpenPickers((s) => ({ ...s, status: open }))} onChange={(status) => void persistPatch({ status })} /></PropertyRow>
                  <PropertyRow label="Assignees"><AssigneePicker users={users} assigneeIds={draft.assigneeIds} disabled={!canEditFull} open={openPickers.assignees} onOpenChange={(open) => setOpenPickers((s) => ({ ...s, assignees: open }))} onToggle={toggleAssignee} selectedLabel={selectedAssignees.length === 0 ? "Add assignees" : selectedAssignees.map((a) => a.name).join(", ")} /></PropertyRow>
                  <PropertyRow label="Priority"><PriorityPicker value={draft.priority} disabled={!canEditFull} open={openPickers.priority} onOpenChange={(open) => setOpenPickers((s) => ({ ...s, priority: open }))} onChange={(priority) => void persistPatch({ priority })} /></PropertyRow>
                  <PropertyRow label="Created by"><div className="px-2 text-sm">{creator?.name ?? "Unknown User"}</div></PropertyRow>
                  <PropertyRow label="Schedule">
                    <DateRangePicker
                      startDate={draft.startDate}
                      dueDate={draft.dueDate}
                      disabled={!canEditFull}
                      onChange={(next) =>
                        void persistPatch({
                          startDate: next.startDate,
                          dueDate: next.dueDate,
                        })
                      }
                    />
                  </PropertyRow>
                  <PropertyRow label="Modules"><SimplePicker icon={<Grid2x2 className="mr-2 size-3.5 text-muted-foreground" />} open={openPickers.module} onOpenChange={(open) => setOpenPickers((s) => ({ ...s, module: open }))} disabled={!canEditFull} label={selectedModule?.name ?? "No module"} placeholder="Search modules..." empty="No modules found." items={[{ id: "none", label: "No module" }, ...modules.map((module) => ({ id: module.id, label: module.name }))]} selectedId={draft.moduleId ?? "none"} onSelect={(id) => void persistPatch({ moduleId: id === "none" ? null : id })} /></PropertyRow>
                  <PropertyRow label="Parent"><SimplePicker open={openPickers.parent} onOpenChange={(open) => setOpenPickers((s) => ({ ...s, parent: open }))} disabled={!canEditFull} label={selectedParent ? `${selectedParent.ticketId} - ${selectedParent.title}` : "Add parent work item"} placeholder="Search parent items..." empty="No parent items found." items={[{ id: "none", label: "No parent" }, ...parentCandidates.map((parent) => ({ id: parent.id, label: `${parent.ticketId} - ${parent.title}` }))]} selectedId={draft.parentId ?? "none"} onSelect={(id) => void persistPatch({ parentId: id === "none" ? null : id })} /></PropertyRow>
                  <PropertyRow label="Labels"><AssigneePicker users={[]} assigneeIds={[]} disabled={!canEditFull} open={openPickers.labels} onOpenChange={(open) => setOpenPickers((s) => ({ ...s, labels: open }))} onToggle={() => undefined} selectedLabel={(draft.labels ?? []).length === 0 ? "Add labels" : (draft.labels ?? []).join(", ")} icon={<Tag className="mr-2 size-3.5 text-muted-foreground" />} placeholder="Search labels..." empty="No labels found." customItems={ITEM_LABELS.map((label) => ({ id: label, label }))} isSelected={(id) => (draft.labels ?? []).includes(id as ItemLabel)} onCustomSelect={(id) => toggleLabel(id as ItemLabel)} /></PropertyRow>
                </div>
              </section>

              <Separator />

              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="inline-flex items-center gap-2 text-sm font-semibold"><MessageSquareText className="size-4" />Activity</h3>
                  <Badge variant="outline">{activityEntries.length}</Badge>
                </div>
                <div className="space-y-2 rounded-md">
                  {activityEntries.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : activityEntries.map((entry) => (
                    <div key={entry.id} className="rounded-md border bg-muted/20 p-2">
                      <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
                      {entry.isComment ? (
                        <div className="mt-1">
                          <p className="text-xs font-medium">{entry.author}</p>
                          <div className="prose prose-sm max-w-none text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_img]:my-2 [&_img]:max-h-64 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-3 [&_ul]:list-disc [&_ul]:pl-5" dangerouslySetInnerHTML={{ __html: entry.content }} />
                        </div>
                      ) : <p className="mt-1 text-sm">{entry.content}</p>}
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <Label>Add comment</Label>
                  <RichTextEditor value={newComment} onChange={setNewComment} placeholder="Write a comment..." />
                  <Button onClick={handleAddComment} size="sm">Comment</Button>
                </div>
              </section>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
      <ConfirmDialog
        open={itemActionDialogOpen}
        title={pendingItemAction === "delete" ? "Delete this item?" : "Archive this item?"}
        description={pendingItemAction === "delete" ? "This will permanently remove the item and its comments." : "Archived items are hidden from active item lists."}
        confirmLabel={pendingItemAction === "delete" ? "Delete" : "Archive"}
        onOpenChange={setItemActionDialogOpen}
        onConfirm={handleConfirmItemAction}
      />
    </Sheet>
  );
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] items-center gap-2 px-3 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div>{children}</div>
    </div>
  );
}

function StatusPicker({
  value,
  disabled,
  open,
  onOpenChange,
  onChange,
}: {
  value: ItemStatus;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (status: ItemStatus) => void;
}) {
  const style = getStatusStyle(value);
  const Icon = style.icon;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled} className="h-8 w-full justify-start px-2 text-left text-sm hover:bg-muted/50">
          <Icon className={cn("mr-2 size-3.5", style.textClass)} />
          <span>{getStatusLabel(value)}</span>
          <ChevronDown className="ml-auto size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search status..." />
          <CommandList>
            <CommandEmpty>No status found.</CommandEmpty>
            <CommandGroup>
              {ITEM_STATUSES.map((status) => (
                <CommandItem key={status} value={getStatusLabel(status)} onSelect={() => { onChange(status); onOpenChange(false); }} className="flex items-center gap-2">
                  {React.createElement(getStatusStyle(status).icon, { className: cn("size-3.5", getStatusStyle(status).textClass) })}
                  <span className="flex-1 truncate">{getStatusLabel(status)}</span>
                  <Check className={cn("size-3.5", normalizeItemStatus(value) === normalizeItemStatus(status) ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function PriorityPicker({
  value,
  disabled,
  open,
  onOpenChange,
  onChange,
}: {
  value: ItemPriority;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (priority: ItemPriority) => void;
}) {
  const style = getPriorityStyle(value);
  const Icon = style.icon;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled} className="h-8 w-full justify-start px-2 text-left text-sm hover:bg-muted/50">
          <Icon className={cn("mr-2 size-3.5", style.textClass)} />
          <span>{value}</span>
          <ChevronDown className="ml-auto size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[240px] p-0">
        <Command>
          <CommandInput placeholder="Search priority..." />
          <CommandList>
            <CommandEmpty>No priority found.</CommandEmpty>
            <CommandGroup>
              {ITEM_PRIORITIES.map((priority) => (
                <CommandItem key={priority} value={priority} onSelect={() => { onChange(priority); onOpenChange(false); }} className="flex items-center gap-2">
                  {React.createElement(getPriorityStyle(priority).icon, { className: cn("size-3.5", getPriorityStyle(priority).textClass) })}
                  <span className="flex-1 truncate">{priority}</span>
                  <Check className={cn("size-3.5", value === priority ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function AssigneePicker({
  users,
  assigneeIds,
  disabled,
  open,
  onOpenChange,
  onToggle,
  selectedLabel,
  icon,
  placeholder = "Search assignees...",
  empty = "No users found.",
  customItems,
  isSelected,
  onCustomSelect,
}: {
  users: User[];
  assigneeIds: string[];
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggle: (id: string) => void;
  selectedLabel: string;
  icon?: React.ReactNode;
  placeholder?: string;
  empty?: string;
  customItems?: Array<{ id: string; label: string }>;
  isSelected?: (id: string) => boolean;
  onCustomSelect?: (id: string) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled} className="h-8 w-full justify-start px-2 text-left text-sm hover:bg-muted/50">
          {icon ?? <Users className="mr-2 size-3.5 text-muted-foreground" />}
          <span className="truncate">{selectedLabel}</span>
          <ChevronDown className="ml-auto size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {customItems
                ? customItems.map((item) => (
                    <CommandItem key={item.id} value={item.label} onSelect={() => onCustomSelect?.(item.id)} className="flex items-center gap-2">
                      <span className="flex-1 truncate">{item.label}</span>
                      <Check className={cn("size-3.5", isSelected?.(item.id) ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))
                : users.map((user) => (
                    <CommandItem key={user.id} value={`${user.name} ${user.email}`} onSelect={() => onToggle(user.id)} className="flex items-center gap-2">
                      <span className="flex-1 truncate">{user.name}</span>
                      <Check className={cn("size-3.5", assigneeIds.includes(user.id) ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function SimplePicker({
  icon,
  open,
  onOpenChange,
  disabled,
  label,
  placeholder,
  empty,
  items,
  selectedId,
  onSelect,
}: {
  icon?: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  disabled: boolean;
  label: string;
  placeholder: string;
  empty: string;
  items: Array<{ id: string; label: string }>;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" disabled={disabled} className="h-8 w-full justify-start px-2 text-left text-sm hover:bg-muted/50">
          {icon}
          <span className="truncate">{label}</span>
          <ChevronDown className="ml-auto size-3 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {items.map((item) => (
                <CommandItem key={item.id} value={item.label} onSelect={() => { onSelect(item.id); onOpenChange(false); }} className="flex items-center gap-2">
                  <span className="flex-1 truncate">{item.label}</span>
                  <Check className={cn("size-3.5", selectedId === item.id ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
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
      return { icon: CircleDashed, textClass: "text-slate-400" };
    case "TODO":
      return { icon: Circle, textClass: "text-slate-300" };
    case "IN_PROGRESS":
      return { icon: LoaderCircle, textClass: "text-amber-500" };
    case "DONE":
      return { icon: CheckCircle2, textClass: "text-emerald-500" };
    default:
      return { icon: XCircle, textClass: "text-slate-400" };
  }
}

function getPriorityStyle(priority: ItemPriority) {
  switch (priority) {
    case "Urgent":
      return { icon: AlertTriangle, textClass: "text-red-500" };
    case "High":
      return { icon: ArrowUp, textClass: "text-orange-500" };
    case "Medium":
      return { icon: Minus, textClass: "text-amber-500" };
    case "Low":
      return { icon: ArrowDown, textClass: "text-blue-500" };
    default:
      return { icon: Minus, textClass: "text-muted-foreground" };
  }
}

function formatDate(value?: string) {
  if (!value) return "No due date";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "No due date" : parsed.toLocaleDateString();
}

function toPlainText(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}
