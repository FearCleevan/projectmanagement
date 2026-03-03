"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import type { Module } from "@/types/domain";

type CreateModuleDialogProps = {
  open: boolean;
  projectId: string;
  onOpenChange: (open: boolean) => void;
  onCreate: (module: Module) => void;
};

export function CreateModuleDialog({
  open,
  projectId,
  onOpenChange,
  onCreate,
}: CreateModuleDialogProps) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");

  React.useEffect(() => {
    if (!open) {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
    }
  }, [open]);

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Module name is required.");
      return;
    }

    const now = new Date().toISOString();
    const moduleId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `module-${Date.now()}`;

    onCreate({
      id: moduleId,
      projectId,
      name: name.trim(),
      description: description.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      createdAt: now,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[1800px]">
        <DialogHeader>
          <DialogTitle>Create Module</DialogTitle>
          <DialogDescription>Create a module to organize project work items.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="module-name">Name</Label>
            <Input
              id="module-name"
              placeholder="e.g. Mobile Release"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="module-description">Description</Label>
            <Textarea
              id="module-description"
              placeholder="Optional notes for this module..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="module-start-date">Start Date</Label>
              <Input
                id="module-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-end-date">End Date</Label>
              <Input
                id="module-end-date"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create Module</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
