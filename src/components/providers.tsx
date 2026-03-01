"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { useAppStore } from "@/store/app-store";

export function Providers({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    useAppStore.getState().initializeSeedData();
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
