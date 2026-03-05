"use client";

import * as React from "react";
import { Loader2, MessageSquareText, MoreHorizontal, Save } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const getChildItems = useAppStore((state) => state.getChildItems);
  const calculateItemProgress = useAppStore((state) => state.calculateItemProgress);

  React.useEffect(() => {
    setDraft(item);
    setNewComment("");
    setSubWorkTitle("");
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
                  <Select
                    value={draft.status}
                    onValueChange={(value) => updateDraft({ status: value as ItemStatus })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Module</Label>
                  <Select
                    value={draft.moduleId ?? "none"}
                    onValueChange={(value) =>
                      updateDraft({ moduleId: value === "none" ? null : value })
                    }
                    disabled={!canEditFull}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Module</SelectItem>
                      {modules.map((module) => (
                        <SelectItem key={module.id} value={module.id}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={draft.priority}
                    onValueChange={(value) => updateDraft({ priority: value as ItemPriority })}
                    disabled={!canEditFull}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_PRIORITIES.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          {priority}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignees</Label>
                <div className="max-h-28 space-y-2 overflow-auto rounded-md border p-2">
                  {users.map((user) => (
                    <label key={user.id} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50">
                      <span>{user.name}</span>
                      <Checkbox
                        checked={draft.assigneeIds.includes(user.id)}
                        disabled={!canEditFull}
                        onCheckedChange={(checked) => toggleAssignee(user.id, checked === true)}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Labels</Label>
                <div className="grid gap-2 rounded-md border p-2 sm:grid-cols-2">
                  {ITEM_LABELS.map((label) => (
                    <label key={label} className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50">
                      <span>{label}</span>
                      <Checkbox
                        checked={(draft.labels ?? []).includes(label)}
                        disabled={!canEditFull}
                        onCheckedChange={(checked) => toggleLabel(label, checked === true)}
                      />
                    </label>
                  ))}
                </div>
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
