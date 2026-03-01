"use client";

import * as React from "react";
import { Activity, FolderKanban, Layers, Users } from "lucide-react";

import { PageHeader } from "@/components/ui-kit/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useAppStore } from "@/store/app-store";

type ActivityFilter = "all" | "projects" | "items" | "comments" | "users";

export default function AppIndexPage() {
  const hydrated = useStoreHydrated();
  const projects = useAppStore((state) => state.projects);
  const items = useAppStore((state) => state.items);
  const users = useAppStore((state) => state.users);
  const activities = useAppStore((state) => state.activities);
  const [activityFilter, setActivityFilter] = React.useState<ActivityFilter>("all");

  const activeProjects = React.useMemo(
    () => projects.filter((project) => !project.archived),
    [projects]
  );

  const modulesCount = React.useMemo(() => {
    const set = new Set<string>();

    for (const project of activeProjects) {
      for (const moduleName of project.modules ?? [project.module]) {
        set.add(moduleName);
      }
    }

    return set.size;
  }, [activeProjects]);

  const openItemsCount = React.useMemo(
    () =>
      items.filter(
        (item) =>
          !item.archived &&
          item.status !== "Done" &&
          item.status !== "Cancelled"
      ).length,
    [items]
  );

  const recentActivities = React.useMemo(() => {
    const filtered = activities.filter((activity) => {
      if (activityFilter === "all") {
        return true;
      }

      if (activityFilter === "projects") {
        return activity.entityType === "project";
      }

      if (activityFilter === "items") {
        return activity.entityType === "item";
      }

      if (activityFilter === "comments") {
        return activity.entityType === "comment";
      }

      return activity.entityType === "user";
    });

    return filtered.slice(0, 30);
  }, [activities, activityFilter]);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-28" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-14" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  const quickStats = [
    { label: "Created Projects", value: String(activeProjects.length), icon: FolderKanban },
    { label: "Modules", value: String(modulesCount), icon: Layers },
    { label: "Workspace Users", value: String(users.length), icon: Users },
    { label: "Open Items", value: String(openItemsCount), icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of workspace volume and recent actions."
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.label} className="border bg-card/70 shadow-sm backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="border bg-card/70 shadow-sm backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest workspace events across projects, items, comments, and users.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              { value: "all", label: "All" },
              { value: "projects", label: "Projects" },
              { value: "items", label: "Items" },
              { value: "comments", label: "Comments" },
              { value: "users", label: "Users" },
            ].map((option) => (
              <Badge
                key={option.value}
                variant={activityFilter === option.value ? "default" : "outline"}
                className="cursor-pointer px-2 py-1"
                onClick={() => setActivityFilter(option.value as ActivityFilter)}
              >
                {option.label}
              </Badge>
            ))}
          </div>
          {recentActivities.length === 0 ? (
            <Badge variant="outline" className="rounded-md px-2 py-1 text-xs">
              No activity yet
            </Badge>
          ) : (
            <ScrollArea className="h-72 pr-3">
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="rounded-md border bg-background/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm">{activity.message}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {activity.action.replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {activity.actorName} • {formatRelativeTime(activity.createdAt)} • {formatDateTime(activity.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString();
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  const diffMs = Date.now() - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "just now";
  }

  if (diffMs < hour) {
    return `${Math.floor(diffMs / minute)}m ago`;
  }

  if (diffMs < day) {
    return `${Math.floor(diffMs / hour)}h ago`;
  }

  return `${Math.floor(diffMs / day)}d ago`;
}
