"use client";

import Link from "next/link";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, FolderKanban, MoreHorizontal, Plus } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog";
import { CreateProjectDialog } from "@/components/ui-kit/create-project-dialog";
import { PageHeader } from "@/components/ui-kit/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useAppStore } from "@/store/app-store";
import { isModuleType, type Project } from "@/types/domain";

export default function ProjectsPage() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const searchParams = useSearchParams();
  const currentUser = useAppStore((state) => state.currentUser);
  const projects = useAppStore((state) => state.projects);
  const items = useAppStore((state) => state.items);
  const selectedModule = useAppStore((state) => state.selectedModule);
  const setSelectedModule = useAppStore((state) => state.setSelectedModule);
  const addProject = useAppStore((state) => state.addProject);
  const setProjects = useAppStore((state) => state.setProjects);
  const archiveProject = useAppStore((state) => state.archiveProject);
  const deleteProject = useAppStore((state) => state.deleteProject);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [projectToEdit, setProjectToEdit] = React.useState<Project | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<"archive" | "delete" | null>(null);
  const [targetProject, setTargetProject] = React.useState<Project | null>(null);

  const moduleParam = searchParams.get("module");
  const moduleFromQuery = isModuleType(moduleParam) ? moduleParam : null;
  const activeModule = moduleFromQuery ?? selectedModule;
  const canManageProjects = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";

  React.useEffect(() => {
    if (moduleFromQuery && moduleFromQuery !== selectedModule) {
      setSelectedModule(moduleFromQuery);
    }
  }, [moduleFromQuery, selectedModule, setSelectedModule]);

  const moduleProjects = React.useMemo(() => {
    if (!activeModule) {
      return [];
    }

    return projects.filter(
      (project) =>
        !project.archived &&
        (project.module === activeModule || (project.modules ?? []).includes(activeModule))
    );
  }, [activeModule, projects]);

  const handleOpenCreateProject = () => {
    if (!canManageProjects) {
      toast.error("Only Owner/Admin can create projects.");
      return;
    }

    setProjectToEdit(null);
    setIsCreateDialogOpen(true);
  };

  const handleProjectDialogOpenChange = (open: boolean) => {
    setIsCreateDialogOpen(open);
    if (!open) {
      setProjectToEdit(null);
    }
  };

  const handleCreateProject = (project: Project) => {
    if (!canManageProjects) {
      toast.error("Only Owner/Admin can create projects.");
      return;
    }

    if (projects.some((existingProject) => existingProject.projectId === project.projectId)) {
      toast.error("Project ID already exists. Please use a unique Project ID.");
      return;
    }

    addProject(project);
    setSelectedModule(project.module);
    toast.success("Project created successfully.");
    router.push(`/app/projects/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    if (!canManageProjects) {
      toast.error("Only Owner/Admin can edit projects.");
      return;
    }

    if (
      projects.some(
        (existingProject) =>
          existingProject.id !== project.id && existingProject.projectId === project.projectId
      )
    ) {
      toast.error("Project ID already exists. Please use a unique Project ID.");
      return;
    }

    setProjects(projects.map((existingProject) => (existingProject.id === project.id ? project : existingProject)));
    setSelectedModule(project.module);
    toast.success("Project updated successfully.");
  };

  const openProjectActionConfirm = (project: Project, action: "archive" | "delete") => {
    setTargetProject(project);
    setPendingAction(action);
    setConfirmDialogOpen(true);
  };

  const handleConfirmProjectAction = () => {
    if (!targetProject || !pendingAction) {
      return;
    }

    if (pendingAction === "archive") {
      archiveProject(targetProject.id);
      toast.success("Project archived.");
    } else {
      deleteProject(targetProject.id);
      toast.success("Project deleted.");
    }
  };

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <Skeleton className="h-36 w-full rounded-none" />
              <CardContent className="space-y-3 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!activeModule) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Projects"
          description="Select a module to access your project workspace."
          actions={
            <Badge variant="outline" className="rounded-md px-2 py-1">
              Module required
            </Badge>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track active projects across your selected module."
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="rounded-md px-2 py-1">
              {activeModule}
            </Badge>
            {canManageProjects ? (
              <Button onClick={handleOpenCreateProject}>
                <Plus className="mr-2 size-4" />
                New Project
              </Button>
            ) : (
              <Badge variant="outline" className="gap-1 rounded-md px-2 py-1">
                <Eye className="size-3.5" />
                View-only
              </Badge>
            )}
          </div>
        }
      />
      {moduleProjects.length === 0 ? (
        <Card className="border shadow-sm">
          <CardContent className="flex flex-col items-center justify-center gap-4 p-10 text-center">
            <div className="rounded-full border bg-muted/40 p-3">
              <FolderKanban className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-medium">No projects in {activeModule}</h2>
              <p className="text-sm text-muted-foreground">
                Create your first project for this module to start planning work.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {moduleProjects.map((project) => {
            const itemCount = items.filter((item) => item.projectId === project.id && !item.archived).length;

            return (
              <Card key={project.id} className="group h-full overflow-hidden border bg-card/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <Link href={`/app/projects/${project.id}`}>
                  <div className="relative h-36 w-full overflow-hidden bg-muted/50">
                    {project.coverImage ? (
                      // next/image is unnecessary for local data URLs here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={project.coverImage}
                        alt={`${project.title} cover`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-[linear-gradient(120deg,hsl(var(--muted))_10%,hsl(var(--accent))_90%)]" />
                    )}
                    {canManageProjects ? (
                      <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="size-8 bg-background/80 backdrop-blur"
                              onClick={(event) => event.preventDefault()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.preventDefault();
                                setProjectToEdit(project);
                                setIsCreateDialogOpen(true);
                              }}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.preventDefault();
                                openProjectActionConfirm(project, "archive");
                              }}
                            >
                              Archive
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(event) => {
                                event.preventDefault();
                                openProjectActionConfirm(project, "delete");
                              }}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ) : null}
                  </div>
                </Link>
                <Link href={`/app/projects/${project.id}`}>
                  <CardContent className="space-y-3 p-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{project.projectId}</p>
                      <h3 className="line-clamp-1 text-base font-semibold tracking-tight">{project.title}</h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {project.description ?? "No project description provided yet."}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1">
                        {(project.modules ?? [project.module]).map((module) => (
                          <Badge key={`${project.id}-${module}`} variant="secondary">
                            {module}
                          </Badge>
                        ))}
                      </div>
                      <Badge variant="outline">{itemCount} items</Badge>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      )}
      {canManageProjects && currentUser ? (
        <CreateProjectDialog
          open={isCreateDialogOpen}
          defaultModule={activeModule}
          ownerId={currentUser.id}
          projectToEdit={projectToEdit}
          onOpenChange={handleProjectDialogOpenChange}
          onCreate={handleCreateProject}
          onUpdate={handleEditProject}
        />
      ) : null}
      <ConfirmDialog
        open={confirmDialogOpen}
        title={pendingAction === "delete" ? "Delete this project?" : "Archive this project?"}
        description={
          pendingAction === "delete"
            ? "This will permanently remove the project and all its items/comments."
            : "Archived projects are hidden from active project listings."
        }
        confirmLabel={pendingAction === "delete" ? "Delete" : "Archive"}
        onOpenChange={setConfirmDialogOpen}
        onConfirm={handleConfirmProjectAction}
      />
    </div>
  );
}
