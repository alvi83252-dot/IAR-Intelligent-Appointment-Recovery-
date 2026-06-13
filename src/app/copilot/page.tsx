import { PersonalAgentCopilot } from "@/components/copilot/personal-agent-copilot";
import { Providers } from "@/app/providers";

export default function CopilotPage() {
  return (
    <Providers>
      <PersonalAgentCopilot />
    </Providers>
  );
}
