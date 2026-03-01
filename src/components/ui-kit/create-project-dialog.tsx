"use client";

import * as React from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { MODULE_TYPES, type ModuleType, type Project } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

type Step = 1 | 2;

type CreateProjectDialogProps = {
  open: boolean;
  defaultModule: ModuleType | null;
  ownerId: string;
  projectToEdit?: Project | null;
  onOpenChange: (open: boolean) => void;
  onCreate: (project: Project) => void;
  onUpdate?: (project: Project) => void;
};

const MAX_PROJECT_COVER_FILE_SIZE_BYTES = 1_500_000;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export function CreateProjectDialog({
  open,
  defaultModule,
  ownerId,
  projectToEdit,
  onOpenChange,
  onCreate,
  onUpdate,
}: CreateProjectDialogProps) {
  const isEditMode = Boolean(projectToEdit);
  const [step, setStep] = React.useState<Step>(1);
  const [modules, setModules] = React.useState<ModuleType[]>(defaultModule ? [defaultModule] : []);
  const [projectCode, setProjectCode] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [coverImage, setCoverImage] = React.useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    if (projectToEdit) {
      setStep(2);
      setModules(
        projectToEdit.modules && projectToEdit.modules.length > 0
          ? projectToEdit.modules
          : [projectToEdit.module]
      );
      setProjectCode(projectToEdit.projectId);
      setTitle(projectToEdit.title);
      setDescription(projectToEdit.description ?? "");
      setCoverImage(projectToEdit.coverImage);
    } else {
      setStep(1);
      setModules(defaultModule ? [defaultModule] : []);
      setProjectCode("");
      setTitle("");
      setDescription("");
      setCoverImage(undefined);
    }

    setIsSubmitting(false);
  }, [defaultModule, open, projectToEdit]);

  const toggleModule = (moduleOption: ModuleType) => {
    setModules((previous) => {
      if (previous.includes(moduleOption)) {
        return previous.filter((value) => value !== moduleOption);
      }

      return [...previous, moduleOption];
    });
  };

  const handleCoverChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    if (file.size > MAX_PROJECT_COVER_FILE_SIZE_BYTES) {
      toast.error("Image is too large. Please use a file under 1.5MB.");
      event.target.value = "";
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setCoverImage(dataUrl);
    } catch {
      toast.error("Unable to read the selected image.");
    }
  };

  const handleNext = () => {
    if (modules.length === 0) {
      toast.error("Please select at least one module before continuing.");
      return;
    }

    setStep(2);
  };

  const handleCreateProject = () => {
    if (modules.length === 0) {
      toast.error("At least one module is required.");
      setStep(1);
      return;
    }

    if (!projectCode.trim()) {
      toast.error("Project ID is required.");
      return;
    }

    if (!title.trim()) {
      toast.error("Project title is required.");
      return;
    }

    const primaryModule = modules[0];
    if (!primaryModule) {
      toast.error("Primary module is required.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    const now = new Date().toISOString();
    const projectPayload: Project = {
      id:
        projectToEdit?.id ??
        (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `project-${Date.now()}`),
      projectId: projectCode.trim().toUpperCase(),
      module: primaryModule,
      modules,
      title: title.trim(),
      description: description.trim() || undefined,
      coverImage,
      ownerId: projectToEdit?.ownerId ?? ownerId,
      memberIds: projectToEdit?.memberIds ?? [],
      archived: projectToEdit?.archived,
      createdAt: projectToEdit?.createdAt ?? now,
      updatedAt: now,
    };

    if (isEditMode) {
      onUpdate?.(projectPayload);
    } else {
      onCreate(projectPayload);
    }

    setIsSubmitting(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl gap-6 p-6 sm:p-8">
        <DialogHeader className="text-left">
          <DialogTitle>{isEditMode ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {step === 1
              ? "Step 1 of 2: Choose a module for this project."
              : isEditMode
                ? "Step 2 of 2: Update project details and save."
                : "Step 2 of 2: Add project details and create."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Badge variant={step === 1 ? "default" : "outline"}>1. Module</Badge>
          <Badge variant={step === 2 ? "default" : "outline"}>2. Project Details</Badge>
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select module(s)</Label>
              <p className="text-xs text-muted-foreground">
                You can select multiple modules. The first selected module will be used as primary.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {MODULE_TYPES.map((moduleOption) => {
                const selected = modules.includes(moduleOption);

                return (
                  <Card
                    key={moduleOption}
                    className={`cursor-pointer border p-3 text-sm transition ${
                      selected ? "border-primary bg-muted/50" : "hover:bg-muted/40"
                    }`}
                    onClick={() => toggleModule(moduleOption)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span>{moduleOption}</span>
                      <span
                        className={`inline-flex size-4 items-center justify-center rounded border text-[10px] ${
                          selected ? "border-primary bg-primary text-primary-foreground" : "border-border"
                        }`}
                      >
                        {selected ? "✓" : ""}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-code">Project ID</Label>
              <Input
                id="project-code"
                value={projectCode}
                onChange={(event) => setProjectCode(event.target.value)}
                placeholder="e.g. DESIGNPH-2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-cover">Cover image</Label>
              <div className="flex items-center gap-3">
                <Input id="project-cover" type="file" accept="image/*" onChange={handleCoverChange} />
                <Upload className="size-4 text-muted-foreground" />
              </div>
              {coverImage ? (
                <div className="mt-2 h-28 overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage} alt="Project cover preview" className="h-full w-full object-cover" />
                </div>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-title">Title</Label>
              <Input
                id="project-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Mobile App Launch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <Textarea
                id="project-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add context for this project..."
              />
            </div>
          </div>
        )}

        <DialogFooter className="justify-between">
          {step === 2 ? (
            <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
              Back
            </Button>
          ) : (
            <div />
          )}
          {step === 1 ? (
            <Button onClick={handleNext}>Next</Button>
          ) : (
            <Button onClick={handleCreateProject} disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? "Saving..." : "Creating...") : isEditMode ? "Save Changes" : "Create Project"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
