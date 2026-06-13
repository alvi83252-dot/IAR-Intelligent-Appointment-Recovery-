"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { PageLoader } from "@/components/motion/page-loader";
import { ScrollProgress } from "@/components/motion/scroll-progress";
import { ScrollSquiggle } from "@/components/motion/scroll-squiggle";
import { useIARStore } from "@/hooks/use-iar-store";

const SQUIGGLE_ROUTES = ["/about", "/start", "/dashboard", "/agents", "/demo", "/disruption", "/practice"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const initA2A = useIARStore((s) => s.initA2A);
  const pathname = usePathname();
  const showSquiggle = SQUIGGLE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  useEffect(() => {
    return initA2A();
  }, [initA2A]);

  return (
    <div className="min-h-screen bg-background">
      <PageLoader />
      <ScrollProgress />
      {showSquiggle && <ScrollSquiggle />}
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
