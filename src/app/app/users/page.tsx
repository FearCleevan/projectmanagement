"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, MoreHorizontal, Pencil, ShieldAlert, Trash2, Upload, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui-kit/confirm-dialog";
import { PageHeader } from "@/components/ui-kit/page-header";
import { RoleBadge } from "@/components/ui-kit/role-badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Role, User } from "@/types/domain";

export default function UsersPage() {
  const hydrated = useStoreHydrated();
  const currentUser = useAppStore((state) => state.currentUser);
  const users = useAppStore((state) => state.users);
  const addUser = useAppStore((state) => state.addUser);
  const updateUser = useAppStore((state) => state.updateUser);
  const archiveUser = useAppStore((state) => state.archiveUser);
  const deleteUser = useAppStore((state) => state.deleteUser);

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = React.useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [activeUserId, setActiveUserId] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [profilePreview, setProfilePreview] = React.useState<string | undefined>(undefined);
  const [role, setRole] = React.useState<Role>("MEMBER");
  const profileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [editName, setEditName] = React.useState("");
  const [editEmail, setEditEmail] = React.useState("");
  const [editPassword, setEditPassword] = React.useState("");
  const [editConfirmPassword, setEditConfirmPassword] = React.useState("");
  const [editPosition, setEditPosition] = React.useState("");
  const [editProfilePreview, setEditProfilePreview] = React.useState<string | undefined>(undefined);
  const [editRole, setEditRole] = React.useState<Role>("MEMBER");
  const editProfileInputRef = React.useRef<HTMLInputElement | null>(null);

  const canManageUsers = currentUser?.role === "OWNER" || currentUser?.role === "ADMIN";
  const isOwner = currentUser?.role === "OWNER";
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;

  React.useEffect(() => {
    if (!createDialogOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setPosition("");
      setProfilePreview(undefined);
      setRole("MEMBER");
      if (profileInputRef.current) {
        profileInputRef.current.value = "";
      }
    }
  }, [createDialogOpen]);

  React.useEffect(() => {
    if (!editDialogOpen) {
      setActiveUserId(null);
      setEditName("");
      setEditEmail("");
      setEditPassword("");
      setEditConfirmPassword("");
      setEditPosition("");
      setEditProfilePreview(undefined);
      setEditRole("MEMBER");
      if (editProfileInputRef.current) {
        editProfileInputRef.current.value = "";
      }
    }
  }, [editDialogOpen]);

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

  const getInitials = (value: string) =>
    value
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "U";

  const canManageTargetUser = (user: User) => {
    if (isOwner) {
      return true;
    }

    return user.role !== "OWNER";
  };

  const handleCreateUser = () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!name.trim() || !normalizedEmail || !password.trim() || !confirmPassword.trim()) {
      toast.error("Name, email, password, and confirm password are required.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Password and confirm password do not match.");
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
      position: position.trim() || undefined,
      avatarUrl: profilePreview,
      createdAt: now,
    });

    toast.success("User created.");
    setCreateDialogOpen(false);
  };

  const handleProfileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    setPreview: React.Dispatch<React.SetStateAction<string | undefined>>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Profile image must be 2MB or less.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEdit = (user: User) => {
    if (!canManageTargetUser(user)) {
      toast.error("Admin cannot manage Owner accounts.");
      return;
    }

    setActiveUserId(user.id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditConfirmPassword("");
    setEditPosition(user.position ?? "");
    setEditProfilePreview(user.avatarUrl);
    setEditRole(user.role);
    setEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!activeUser) {
      return;
    }

    if (!canManageTargetUser(activeUser)) {
      toast.error("You do not have permission to edit this user.");
      return;
    }

    const normalizedEmail = editEmail.trim().toLowerCase();

    if (!editName.trim() || !normalizedEmail) {
      toast.error("Name and email are required.");
      return;
    }

    if (!isOwner && editRole === "OWNER") {
      toast.error("Admin cannot assign Owner role.");
      return;
    }

    if (
      users.some(
        (user) => user.id !== activeUser.id && user.email.toLowerCase() === normalizedEmail
      )
    ) {
      toast.error("A user with this email already exists.");
      return;
    }

    const hasPasswordInput = editPassword.trim().length > 0 || editConfirmPassword.trim().length > 0;
    if (hasPasswordInput && editPassword !== editConfirmPassword) {
      toast.error("Password and confirm password do not match.");
      return;
    }

    updateUser({
      ...activeUser,
      name: editName.trim(),
      email: normalizedEmail,
      role: editRole,
      position: editPosition.trim() || undefined,
      avatarUrl: editProfilePreview,
      password: editPassword.trim() ? editPassword.trim() : activeUser.password,
    });

    toast.success("User updated.");
    setEditDialogOpen(false);
  };

  const handleConfirmArchive = () => {
    if (!activeUser) {
      return;
    }

    if (currentUser?.id === activeUser.id) {
      toast.error("You cannot archive your own account.");
      return;
    }

    if (!canManageTargetUser(activeUser)) {
      toast.error("You do not have permission to archive this user.");
      return;
    }

    archiveUser(activeUser.id);
    toast.success("User archived.");
    setArchiveConfirmOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!activeUser) {
      return;
    }

    if (currentUser?.id === activeUser.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    if (!canManageTargetUser(activeUser)) {
      toast.error("You do not have permission to delete this user.");
      return;
    }

    deleteUser(activeUser.id);
    toast.success("User deleted.");
    setDeleteConfirmOpen(false);
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
                  <TableHead>Position</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[56px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={user.archived ? "opacity-60" : undefined}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          <AvatarImage src={user.avatarUrl} alt={user.name} />
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.name}</span>
                        {user.archived ? (
                          <Badge variant="secondary" className="text-xs">
                            Archived
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.position || "-"}</TableCell>
                    <TableCell>
                      <RoleBadge role={user.role} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Open actions for ${user.name}`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleOpenEdit(user)}
                            disabled={!canManageTargetUser(user)}
                          >
                            <Pencil className="size-4 text-muted-foreground" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setActiveUserId(user.id);
                              setArchiveConfirmOpen(true);
                            }}
                            disabled={!canManageTargetUser(user) || user.archived || currentUser?.id === user.id}
                          >
                            <Archive className="size-4 text-muted-foreground" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => {
                              setActiveUserId(user.id);
                              setDeleteConfirmOpen(true);
                            }}
                            disabled={!canManageTargetUser(user) || currentUser?.id === user.id}
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
              <Label>Profile</Label>
              <div className="flex items-center gap-3">
                <Avatar className="size-16 border">
                  <AvatarImage src={profilePreview} alt="Profile preview" />
                  <AvatarFallback>
                    {(name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() ?? "")
                      .join("") || "U")
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => profileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setProfilePreview(undefined);
                      if (profileInputRef.current) {
                        profileInputRef.current.value = "";
                      }
                    }}
                    disabled={!profilePreview}
                  >
                    <X className="mr-2 size-4" />
                    Remove
                  </Button>
                </div>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleProfileUpload(event, setProfilePreview)}
                />
              </div>
            </div>

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
              <Label htmlFor="create-user-confirm-password">Confirm Password</Label>
              <Input
                id="create-user-confirm-password"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-user-position">Position</Label>
              <Input
                id="create-user-position"
                placeholder="e.g. Frontend Dev"
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                list="create-user-position-list"
              />
              <datalist id="create-user-position-list">
                <option value="Frontend Dev" />
                <option value="Backend Dev" />
                <option value="UI/UX Designer" />
                <option value="QA Engineer" />
                <option value="FullStack Dev" />
              </datalist>
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

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user details and role permissions.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profile</Label>
              <div className="flex items-center gap-3">
                <Avatar className="size-16 border">
                  <AvatarImage src={editProfilePreview} alt="Profile preview" />
                  <AvatarFallback>{getInitials(editName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => editProfileInputRef.current?.click()}
                  >
                    <Upload className="mr-2 size-4" />
                    Upload
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEditProfilePreview(undefined);
                      if (editProfileInputRef.current) {
                        editProfileInputRef.current.value = "";
                      }
                    }}
                    disabled={!editProfilePreview}
                  >
                    <X className="mr-2 size-4" />
                    Remove
                  </Button>
                </div>
                <input
                  ref={editProfileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => handleProfileUpload(event, setEditProfilePreview)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-name">Full Name</Label>
              <Input
                id="edit-user-name"
                placeholder="e.g. Jane Doe"
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-email">Email</Label>
              <Input
                id="edit-user-email"
                type="email"
                placeholder="jane@company.com"
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-password">Password</Label>
              <Input
                id="edit-user-password"
                type="password"
                placeholder="Leave blank to keep current password"
                value={editPassword}
                onChange={(event) => setEditPassword(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-confirm-password">Confirm Password</Label>
              <Input
                id="edit-user-confirm-password"
                type="password"
                placeholder="Re-enter new password"
                value={editConfirmPassword}
                onChange={(event) => setEditConfirmPassword(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-user-position">Position</Label>
              <Input
                id="edit-user-position"
                placeholder="e.g. Frontend Dev"
                value={editPosition}
                onChange={(event) => setEditPosition(event.target.value)}
                list="edit-user-position-list"
              />
              <datalist id="edit-user-position-list">
                <option value="Frontend Dev" />
                <option value="Backend Dev" />
                <option value="UI/UX Designer" />
                <option value="QA Engineer" />
                <option value="FullStack Dev" />
              </datalist>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
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
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={archiveConfirmOpen}
        title="Archive user?"
        description={`This will disable ${activeUser?.name ?? "this user"} from signing in.`}
        confirmLabel="Archive"
        onOpenChange={setArchiveConfirmOpen}
        onConfirm={handleConfirmArchive}
      />

      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete user?"
        description={`This permanently removes ${activeUser?.name ?? "this user"} from the workspace.`}
        confirmLabel="Delete"
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
      />
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
