"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  FolderKanban,
  House,
  Layers,
  LogOut,
  Moon,
  Search,
  Settings,
  Sun,
  UserCircle2,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { isModuleType, type ModuleType } from "@/types/domain";
import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog";
import { ModulePickerDialog } from "@/components/ui-kit/module-picker-dialog";
import { RoleBadge } from "@/components/ui-kit/role-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAppStore } from "@/store/app-store";

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const workspaceNav: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: House },
  { href: "/app/projects", label: "Projects", icon: FolderKanban },
];

const manageNav: NavItem[] = [
  { href: "/app/users", label: "Users", icon: Users },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const currentUser = useAppStore((state) => state.currentUser);
  const selectedModule = useAppStore((state) => state.selectedModule);
  const resetSession = useAppStore((state) => state.resetSession);
  const setSelectedModule = useAppStore((state) => state.setSelectedModule);
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";
  const [modulePickerOpen, setModulePickerOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [draftModule, setDraftModule] = useState<ModuleType | null>(selectedModule);
  const moduleParam = searchParams.get("module");
  const moduleFromQuery = isModuleType(moduleParam) ? moduleParam : null;
  const userName = currentUser?.name ?? "Workspace User";
  const userEmail = currentUser?.email ?? "user@workspace.local";
  const userRole = currentUser?.role ?? "MEMBER";
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const handleLogout = () => {
    resetSession();
    toast.success("Logged out.");
    router.replace("/login");
  };

  const handleSwitchModuleClick = () => {
    setDraftModule(selectedModule);
    setModulePickerOpen(true);
  };

  const handleModulePickerOpenChange = (open: boolean) => {
    if (!open) {
      setDraftModule(selectedModule);
    }

    setModulePickerOpen(open);
  };

  const handleModuleContinue = () => {
    if (!draftModule) {
      return;
    }

    setSelectedModule(draftModule);
    setModulePickerOpen(false);
    toast.success(`${draftModule} module selected.`);
    router.push(`/app/projects?module=${encodeURIComponent(draftModule)}`);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDraftModule(selectedModule);
  }, [selectedModule]);

  useEffect(() => {
    if (
      pathname.startsWith("/app/projects") &&
      moduleFromQuery &&
      moduleFromQuery !== selectedModule
    ) {
      setSelectedModule(moduleFromQuery);
    }
  }, [moduleFromQuery, pathname, selectedModule, setSelectedModule]);

  const isActivePath = (href: string) => {
    if (href === "/app") {
      return pathname === "/app";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_hsl(var(--muted))_0%,_hsl(var(--background))_42%)] p-4 md:p-6">
      <div className="flex w-full gap-4">
        <Card className="sticky top-4 hidden h-[calc(100vh-2rem)] w-[270px] border bg-card/80 p-4 shadow-sm backdrop-blur-md md:block">
          <div className="mb-5 rounded-lg border bg-muted/50 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Workspace</p>
            <p className="mt-1 text-sm font-medium tracking-tight">Internal PM</p>
          </div>
          <nav className="space-y-1.5">
            {workspaceNav.map((item) => (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:bg-muted",
                      isActivePath(item.href) && "border-border bg-muted font-medium"
                    )}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    {item.label}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
          <Separator className="my-4" />
          <div className="mb-2 mt-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Manage</p>
          </div>
          <nav className="space-y-1.5">
            {manageNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-sm transition-colors hover:bg-muted",
                  isActivePath(item.href) && "border-border bg-muted font-medium"
                )}
              >
                <item.icon className="size-4 text-muted-foreground" />
                {item.label}
              </Link>
            ))}
          </nav>
        </Card>

        <div className="min-w-0 flex-1">
          <Card className="mb-4 border bg-card/80 p-3 shadow-sm backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search projects, users, and tasks..." />
              </div>
              <Button
                variant="outline"
                className="h-10 gap-2 px-3"
                onClick={handleSwitchModuleClick}
              >
                <Layers className="size-4 text-muted-foreground" />
                <span className="hidden sm:inline">Switch Module</span>
                <Badge variant="secondary" className="ml-1 hidden md:inline-flex">
                  {selectedModule ?? "None"}
                </Badge>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(nextTheme)}
                className="shrink-0"
                aria-label="Toggle theme"
                disabled={!mounted}
              >
                {!mounted ? (
                  <Moon className="size-4" />
                ) : resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-10 gap-2 px-2 md:px-3">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-xs">{initials || "WU"}</AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm md:inline">{userName}</span>
                    <ChevronDown className="hidden size-4 text-muted-foreground md:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{userEmail}</p>
                    <div className="mt-2">
                      <RoleBadge role={userRole} />
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/app/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <UserCircle2 className="mr-2 size-4 text-muted-foreground" />
                    Account
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLogoutConfirmOpen(true)}>
                    <LogOut className="mr-2 size-4 text-muted-foreground" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </Card>
          <main className="w-full pb-10">{children}</main>
        </div>
      </div>
      <ModulePickerDialog
        open={modulePickerOpen}
        selectedModule={draftModule}
        onSelectedModuleChange={setDraftModule}
        onContinue={handleModuleContinue}
        onOpenChange={handleModulePickerOpenChange}
      />
      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Log out?"
        description="You will be signed out from the current session."
        confirmLabel="Log out"
        onOpenChange={setLogoutConfirmOpen}
        onConfirm={handleLogout}
      />
    </div>
  );
}
