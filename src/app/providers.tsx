"use client";

import { CopilotKit } from "@copilotkit/react-core/v2";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CopilotKit
      agent="personal"
      runtimeUrl="/api/copilotkit"
      useSingleEndpoint={false}
      onError={(event) => {
        console.error("[copilotkit]", event);
      }}
    >
      {children}
    </CopilotKit>
  );
}
