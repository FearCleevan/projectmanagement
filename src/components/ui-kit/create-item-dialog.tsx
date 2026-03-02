"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ITEM_LABELS,
  ITEM_STATUSES,
  type ItemLabel,
  type ItemPriority,
  type ItemStatus,
  type Module,
  type ProjectItem,
  type User,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ITEM_PRIORITIES: ItemPriority[] = ["Low", "Medium", "High", "Urgent"];

type CreateItemDialogProps = {
  open: boolean;
  projectCode: string;
  existingTicketIds: string[];
  projectId: string;
  creatorId: string;
  modules: Module[];
  items: ProjectItem[];
  users: User[];
  onOpenChange: (open: boolean) => void;
  onCreate: (item: ProjectItem) => void;
};

export function CreateItemDialog({
  open,
  projectCode,
  existingTicketIds,
  projectId,
  creatorId,
  modules,
  items,
  users,
  onOpenChange,
  onCreate,
}: CreateItemDialogProps) {
  const [title, setTitle] = React.useState("");
  const [status, setStatus] = React.useState<ItemStatus>("Backlog");
  const [priority, setPriority] = React.useState<ItemPriority>("Medium");
  const [labels, setLabels] = React.useState<ItemLabel[]>([]);
  const [assigneeIds, setAssigneeIds] = React.useState<string[]>([]);
  const [parentId, setParentId] = React.useState<string>("none");
  const [moduleId, setModuleId] = React.useState<string>("none");
  const [startDate, setStartDate] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  const parentCandidates = React.useMemo(
    () =>
      items.filter(
        (item) => item.projectId === projectId && !item.archived && (item.parentId == null)
      ),
    [items, projectId]
  );
  const selectedParent = React.useMemo(
    () => parentCandidates.find((item) => item.id === parentId) ?? null,
    [parentCandidates, parentId]
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setTitle("");
    setStatus("Backlog");
    setPriority("Medium");
    setLabels([]);
    setAssigneeIds([]);
    setParentId("none");
    setModuleId("none");
    setStartDate("");
    setDueDate("");
  }, [open]);

  React.useEffect(() => {
    if (!selectedParent) {
      return;
    }

    setModuleId(selectedParent.moduleId ?? "none");
  }, [selectedParent]);

  const toggleAssignee = (userId: string, checked: boolean) => {
    if (checked) {
      setAssigneeIds((prev) => [...new Set([...prev, userId])]);
      return;
    }

    setAssigneeIds((prev) => prev.filter((id) => id !== userId));
  };

  const toggleLabel = (label: ItemLabel, checked: boolean) => {
    if (checked) {
      setLabels((prev) => [...new Set([...prev, label])]);
      return;
    }

    setLabels((prev) => prev.filter((value) => value !== label));
  };

  const generateNextTicketId = () => {
    const prefix = projectCode.toUpperCase().replace(/[^A-Z0-9]/g, "") || "ITEM";
    let maxNumber = 0;

    for (const ticket of existingTicketIds) {
      if (!ticket.startsWith(`${prefix}-`)) {
        continue;
      }

      const parsed = Number(ticket.split("-")[1]);
      if (!Number.isNaN(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }

    return `${prefix}-${maxNumber + 1}`;
  };

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error("Item title is required.");
      return;
    }

    const now = new Date().toISOString();
    const generatedId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `item-${Date.now()}`;

    onCreate({
      id: generatedId,
      ticketId: generateNextTicketId(),
      projectId,
      title: title.trim(),
      moduleId: moduleId === "none" ? null : moduleId,
      parentId: parentId === "none" ? null : parentId,
      status,
      priority,
      labelIds: labels,
      labels,
      assigneeIds,
      startDate: startDate || undefined,
      dueDate: dueDate || undefined,
      createdBy: creatorId,
      createdAt: now,
      updatedAt: now,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>Create a new item for this project.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="new-item-title">Title</Label>
            <Input
              id="new-item-title"
              placeholder="e.g. Prepare stakeholder deck"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(value) => setStatus(value as ItemStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_STATUSES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Parent Item (optional)</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select parent item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Parent</SelectItem>
                  {parentCandidates.map((parent) => (
                    <SelectItem key={parent.id} value={parent.id}>
                      {parent.ticketId} - {parent.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Module</Label>
              <Select
                value={moduleId}
                onValueChange={setModuleId}
                disabled={Boolean(selectedParent)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select module" />
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
              <Select value={priority} onValueChange={(value) => setPriority(value as ItemPriority)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_PRIORITIES.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            <div className="max-h-36 space-y-2 overflow-auto rounded-md border p-2">
              {users.map((user) => (
                <label key={user.id} className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50">
                  <span>{user.name}</span>
                  <Checkbox
                    checked={assigneeIds.includes(user.id)}
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
                <label key={label} className="flex cursor-pointer items-center justify-between rounded px-2 py-1 text-sm hover:bg-muted/50">
                  <span>{label}</span>
                  <Checkbox
                    checked={labels.includes(label)}
                    onCheckedChange={(checked) => toggleLabel(label, checked === true)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-item-start">Start Date</Label>
              <Input
                id="new-item-start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-item-due">Due Date</Label>
              <Input
                id="new-item-due"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleCreate}>Create Item</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
