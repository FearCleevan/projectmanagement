import { SlidersHorizontal } from "lucide-react";

import { EmptyState } from "@/components/ui-kit/empty-state";
import { PageHeader } from "@/components/ui-kit/page-header";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Configure workspace preferences, defaults, and behavior."
      />
      <EmptyState
        icon={SlidersHorizontal}
        title="Settings are coming next"
        description="Core settings controls will be added once authentication and permissions are wired."
      />
    </div>
  );
}
