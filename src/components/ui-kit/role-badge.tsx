import { Badge } from "@/components/ui/badge";

type Role = "OWNER" | "ADMIN" | "MEMBER";

const roleStyles: Record<Role, string> = {
  OWNER: "bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900",
  ADMIN: "bg-slate-700 text-slate-100 dark:bg-slate-200 dark:text-slate-900",
  MEMBER:
    "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border-slate-300/70 dark:border-slate-700/70",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="outline" className={roleStyles[role]}>
      {role}
    </Badge>
  );
}
