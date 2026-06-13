"use client";

import { useCallback, useEffect, useState } from "react";
import { ACCESS_MODE_STORAGE_KEY, type AccessMode } from "@/lib/config";

export function useAccessMode() {
  const [mode, setModeState] = useState<AccessMode>("text");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(ACCESS_MODE_STORAGE_KEY);
    if (stored === "text" || stored === "voice") {
      setModeState(stored);
    }
    setReady(true);
  }, []);

  const setMode = useCallback((next: AccessMode) => {
    sessionStorage.setItem(ACCESS_MODE_STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const isVoice = mode === "voice";

  return { mode, setMode, isVoice, ready };
}
