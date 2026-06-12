"use client";

import { useEffect } from "react";
import { Navbar } from "./navbar";
import { PageLoader } from "@/components/motion/page-loader";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { useCareFlowStore } from "@/hooks/use-careflow-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const initA2A = useCareFlowStore((s) => s.initA2A);

  useEffect(() => {
    return initA2A();
  }, [initA2A]);

  return (
    <div className="min-h-screen bg-background">
      <PageLoader />
      <ScrollProgress />
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
