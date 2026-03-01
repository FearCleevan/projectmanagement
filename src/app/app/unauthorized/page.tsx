import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="w-full max-w-lg border shadow-sm">
        <CardHeader className="space-y-2">
          <div className="flex size-10 items-center justify-center rounded-full border bg-muted/40">
            <ShieldAlert className="size-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl font-semibold">Unauthorized</CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            You do not have permission to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/app">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
