"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldAlert, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui-kit/page-header";
import { RoleBadge } from "@/components/ui-kit/role-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreHydrated } from "@/hooks/use-store-hydrated";
import { useAppStore } from "@/store/app-store";
import type { Role } from "@/types/domain";

export default function UsersPage() {
  const hydrated = useStoreHydrated();
  const currentUser = useAppStore((state) => state.currentUser);
  const users = useAppStore((state) => state.users);
  const addUser = useAppStore((state) => state.addUser);

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>("MEMBER");

  const canManageUsers = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";
  const isOwner = currentUser?.role === "OWNER";

  React.useEffect(() => {
    if (!createDialogOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("MEMBER");
    }
  }, [createDialogOpen]);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Card className="border shadow-sm">
          <CardContent className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="space-y-6">
        <PageHeader title="Users" description="Manage members, roles, and access across your workspace." />
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full border bg-muted/40">
              <ShieldAlert className="size-5 text-muted-foreground" />
            </div>
            <CardTitle>Unauthorized</CardTitle>
            <CardDescription>
              You do not have permission to manage users. Owner/Admin access is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/app/unauthorized">Open Unauthorized Page</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCreateUser = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password.trim()) {
      toast.error("Name, email, and password are required.");
      return;
    }

    if (!isOwner && role === "OWNER") {
      toast.error("Admin cannot assign Owner role.");
      return;
    }

    if (users.some((user) => user.email.toLowerCase() === normalizedEmail)) {
      toast.error("A user with this email already exists.");
      return;
    }

    const now = new Date().toISOString();
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `user-${Date.now()}`;

    addUser({
      id,
      name: name.trim(),
      email: normalizedEmail,
      password: password.trim(),
      role,
      createdAt: now,
    });

    toast.success("User created.");
    setCreateDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage members, roles, and access across your workspace."
        actions={
          <Button onClick={() => setCreateDialogOpen(true)}>
            <UserPlus className="mr-2 size-4" />
            Create User
          </Button>
        }
      />

      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {users.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <div className="rounded-full border bg-muted/40 p-3">
                <Users className="size-5 text-muted-foreground" />
              </div>
              <p className="font-medium">No users found</p>
              <p className="text-sm text-muted-foreground">Create a user to grant workspace access.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarFallback className="text-xs">
                            {user.name
                              .split(" ")
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((part) => part[0]?.toUpperCase() ?? "")
                              .join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>Add a new user and assign role-based access.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="create-user-name">Full Name</Label>
              <Input
                id="create-user-name"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-email">Email</Label>
              <Input
                id="create-user-email"
                type="email"
                placeholder="jane@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-password">Password</Label>
              <Input
                id="create-user-password"
                type="password"
                placeholder="Set temporary password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as Role)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {isOwner ? <SelectItem value="OWNER">OWNER</SelectItem> : null}
                  <SelectItem value="ADMIN">ADMIN</SelectItem>
                  <SelectItem value="MEMBER">MEMBER</SelectItem>
                </SelectContent>
              </Select>
              {!isOwner ? (
                <Badge variant="outline" className="w-fit text-xs">
                  Admin cannot assign Owner
                </Badge>
              ) : null}
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleCreateUser}>Create User</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
