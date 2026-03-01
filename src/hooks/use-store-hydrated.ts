"use client";

import * as React from "react";

import { useAppStore } from "@/store/app-store";

export function useStoreHydrated() {
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    const persistApi = useAppStore.persist;

    if (!persistApi) {
      setHydrated(true);
      return;
    }

    const unsubscribeHydrate = persistApi.onHydrate(() => setHydrated(false));
    const unsubscribeFinishHydration = persistApi.onFinishHydration(() => setHydrated(true));

    setHydrated(persistApi.hasHydrated());

    return () => {
      unsubscribeHydrate();
      unsubscribeFinishHydration();
    };
  }, []);

  return hydrated;
}
