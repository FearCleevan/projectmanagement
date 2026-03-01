"use client";

import type { ComponentType } from "react";
import {
  Code2,
  Cog,
  FolderKanban,
  ListTodo,
  Megaphone,
  Package,
  Palette,
  Server,
  UsersRound,
} from "lucide-react";

import type { ModuleType } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ModuleOption = {
  module: ModuleType;
  icon: ComponentType<{ className?: string }>;
};

const moduleOptions: ModuleOption[] = [
  { module: "Projects", icon: FolderKanban },
  { module: "Tasks", icon: ListTodo },
  { module: "Marketing", icon: Megaphone },
  { module: "Design", icon: Palette },
  { module: "CRM", icon: UsersRound },
  { module: "Software", icon: Code2 },
  { module: "IT", icon: Server },
  { module: "Operations", icon: Cog },
  { module: "Product", icon: Package },
];

type ModulePickerDialogProps = {
  open: boolean;
  forceSelection?: boolean;
  selectedModule: ModuleType | null;
  onSelectedModuleChange: (module: ModuleType) => void;
  onContinue: () => void;
  onOpenChange: (open: boolean) => void;
};

export function ModulePickerDialog({
  open,
  forceSelection = false,
  selectedModule,
  onSelectedModuleChange,
  onContinue,
  onOpenChange,
}: ModulePickerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={!forceSelection}
        className="max-w-3xl gap-6 p-6 sm:p-8"
        onEscapeKeyDown={(event) => {
          if (forceSelection) {
            event.preventDefault();
          }
        }}
        onInteractOutside={(event) => {
          if (forceSelection) {
            event.preventDefault();
          }
        }}
      >
        <DialogHeader className="space-y-2 text-left">
          <DialogTitle>What would you like to manage?</DialogTitle>
          <DialogDescription>Choose a module to tailor your workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {moduleOptions.map((option) => {
            const isSelected = selectedModule === option.module;

            return (
              <Card
                key={option.module}
                className="group relative cursor-pointer border bg-card/70 p-4 shadow-sm transition hover:border-primary/40 hover:bg-muted/40"
                onClick={() => onSelectedModuleChange(option.module)}
              >
                <Checkbox
                  aria-label={`Select ${option.module}`}
                  className="absolute top-3 left-3"
                  checked={isSelected}
                  onCheckedChange={() => onSelectedModuleChange(option.module)}
                />
                <div className="flex min-h-28 flex-col items-center justify-center gap-3">
                  <option.icon className="size-6 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <p className="text-sm font-medium">{option.module}</p>
                </div>
              </Card>
            );
          })}
        </div>
        <DialogFooter>
          <Button className="min-w-40" onClick={onContinue} disabled={!selectedModule}>
            Continue →
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
