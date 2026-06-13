"use client";

import { useEffect } from "react";
import { Navbar } from "./navbar";
import { PageLoader } from "@/components/motion/page-loader";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { useIARStore } from "@/hooks/use-iar-store";

export function AppShell({ children }: { children: React.ReactNode }) {
  const initA2A = useIARStore((s) => s.initA2A);

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
