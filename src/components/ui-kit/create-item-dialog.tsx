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
  LoaderCircle,
  Minus,
  Tag,
  Users,
  XCircle,
} from "lucide-react";
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
  normalizeItemStatus,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RichTextEditor } from "@/components/ui-kit/rich-text-editor";
import { DateRangePicker } from "@/components/ui-kit/date-range-picker";
import { cn } from "@/lib/utils";

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
  const [description, setDescription] = React.useState("");
  const [statusPickerOpen, setStatusPickerOpen] = React.useState(false);
  const [parentPickerOpen, setParentPickerOpen] = React.useState(false);
  const [modulePickerOpen, setModulePickerOpen] = React.useState(false);
  const [priorityPickerOpen, setPriorityPickerOpen] = React.useState(false);
  const [assigneePickerOpen, setAssigneePickerOpen] = React.useState(false);
  const [labelPickerOpen, setLabelPickerOpen] = React.useState(false);
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
    setDescription("");
    setStatusPickerOpen(false);
    setParentPickerOpen(false);
    setModulePickerOpen(false);
    setPriorityPickerOpen(false);
    setAssigneePickerOpen(false);
    setLabelPickerOpen(false);
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
      description: toPlainText(description).trim() ? description : undefined,
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

  const selectedAssignees = React.useMemo(
    () => users.filter((user) => assigneeIds.includes(user.id)),
    [assigneeIds, users]
  );
  const statusStyle = getStatusStyle(status);
  const StatusIcon = statusStyle.icon;
  const priorityStyle = getPriorityStyle(priority);
  const PriorityIcon = priorityStyle.icon;
  const selectedModule = modules.find((module) => module.id === moduleId) ?? null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1800px]">
        <DialogHeader>
          <DialogTitle>New Item</DialogTitle>
          <DialogDescription>Create a new item for this project.</DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[72vh] gap-5 overflow-y-auto pr-1">
          <div className="space-y-2">
            <Label htmlFor="new-item-title">Title</Label>
            <Input
              id="new-item-title"
              placeholder="e.g. Prepare stakeholder deck"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Popover open={statusPickerOpen} onOpenChange={setStatusPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className={cn(
                      "h-9 w-full justify-between rounded-md text-xs font-normal hover:bg-muted/40",
                      statusStyle.borderClass,
                      statusStyle.bgClass
                    )}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <StatusIcon className={cn("size-3.5", statusStyle.textClass)} />
                      {getStatusLabel(status)}
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
                        {ITEM_STATUSES.map((option) => {
                          const optionStyle = getStatusStyle(option);
                          const OptionIcon = optionStyle.icon;
                          const normalized = normalizeItemStatus(option);
                          const active = normalizeItemStatus(status);
                          return (
                            <CommandItem
                              key={option}
                              value={getStatusLabel(option)}
                              onSelect={() => {
                                setStatus(option);
                                setStatusPickerOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              <OptionIcon className={cn("size-3.5", optionStyle.textClass)} />
                              <span className="flex-1 truncate">{getStatusLabel(option)}</span>
                              <Check className={cn("size-3.5", active === normalized ? "opacity-100" : "opacity-0")} />
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
              <Label>Parent Item (optional)</Label>
              <Popover open={parentPickerOpen} onOpenChange={setParentPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
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
                            setParentId("none");
                            setParentPickerOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <span className="flex-1 truncate">No Parent</span>
                          <Check className={cn("size-3.5", parentId === "none" ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                        {parentCandidates.map((parent) => (
                          <CommandItem
                            key={parent.id}
                            value={`${parent.ticketId} ${parent.title}`}
                            onSelect={() => {
                              setParentId(parent.id);
                              setParentPickerOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <span className="flex-1 truncate">{parent.ticketId} - {parent.title}</span>
                            <Check className={cn("size-3.5", parentId === parent.id ? "opacity-100" : "opacity-0")} />
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
                    disabled={Boolean(selectedParent)}
                    className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <Grid2x2 className="size-3.5 text-muted-foreground" />
                      {selectedModule?.name ?? "No Module"}
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
                            setModuleId("none");
                            setModulePickerOpen(false);
                          }}
                          className="flex items-center gap-2"
                        >
                          <Grid2x2 className="size-3.5 text-muted-foreground" />
                          <span className="flex-1 truncate">No Module</span>
                          <Check className={cn("size-3.5", moduleId === "none" ? "opacity-100" : "opacity-0")} />
                        </CommandItem>
                        {modules.map((module) => (
                          <CommandItem
                            key={module.id}
                            value={module.name}
                            onSelect={() => {
                              setModuleId(module.id);
                              setModulePickerOpen(false);
                            }}
                            className="flex items-center gap-2"
                          >
                            <Grid2x2 className="size-3.5 text-muted-foreground" />
                            <span className="flex-1 truncate">{module.name}</span>
                            <Check className={cn("size-3.5", moduleId === module.id ? "opacity-100" : "opacity-0")} />
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
                    className={cn(
                      "h-9 w-full justify-between rounded-md text-xs font-normal hover:bg-muted/40",
                      priorityStyle.borderClass,
                      priorityStyle.bgClass
                    )}
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <PriorityIcon className={cn("size-3.5", priorityStyle.textClass)} />
                      {priority}
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
                        {ITEM_PRIORITIES.map((option) => {
                          const optionStyle = getPriorityStyle(option);
                          const OptionIcon = optionStyle.icon;
                          return (
                            <CommandItem
                              key={option}
                              value={option}
                              onSelect={() => {
                                setPriority(option);
                                setPriorityPickerOpen(false);
                              }}
                              className="flex items-center gap-2"
                            >
                              <OptionIcon className={cn("size-3.5", optionStyle.textClass)} />
                              <span className="flex-1 truncate">{option}</span>
                              <Check className={cn("size-3.5", priority === option ? "opacity-100" : "opacity-0")} />
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
            <Label htmlFor="new-item-description">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Add a description... You can paste formatted text and images."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
            <div className="space-y-2">
              <Label>Assignees</Label>
              <Popover open={assigneePickerOpen} onOpenChange={setAssigneePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <Users className="size-4 text-muted-foreground" />
                      {assigneeIds.length === 0 ? "Select assignees" : `${assigneeIds.length} selected`}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px] p-0">
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
                              onSelect={() => toggleAssignee(user.id, !isSelected)}
                              className="flex items-center gap-2"
                            >
                              <Check className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")} />
                              <span className="truncate">{user.name}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {selectedAssignees.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {selectedAssignees.map((user) => (
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
                    className="h-9 w-full justify-between rounded-md border-border/60 bg-muted/30 text-xs font-normal hover:bg-muted/40"
                  >
                    <span className="inline-flex items-center gap-2 truncate">
                      <Tag className="size-4 text-muted-foreground" />
                      {labels.length === 0 ? "Select labels" : `${labels.length} selected`}
                    </span>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[320px] p-0">
                  <Command>
                    <CommandInput placeholder="Search labels..." />
                    <CommandList>
                      <CommandEmpty>No labels found.</CommandEmpty>
                      <CommandGroup>
                        {ITEM_LABELS.map((label) => {
                          const isSelected = labels.includes(label);
                          return (
                            <CommandItem
                              key={label}
                              value={label}
                              onSelect={() => toggleLabel(label, !isSelected)}
                              className="flex items-center gap-2"
                            >
                              <Check className={cn("size-4", isSelected ? "opacity-100" : "opacity-0")} />
                              <span>{label}</span>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {labels.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {labels.map((label) => (
                    <Badge key={label} variant="outline" className="font-normal">
                      {label}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="space-y-2 md:col-span-2 xl:col-span-2">
              <Label>Schedule</Label>
              <DateRangePicker
                startDate={startDate || undefined}
                dueDate={dueDate || undefined}
                onChange={(next) => {
                  setStartDate(next.startDate ?? "");
                  setDueDate(next.dueDate ?? "");
                }}
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

function toPlainText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
