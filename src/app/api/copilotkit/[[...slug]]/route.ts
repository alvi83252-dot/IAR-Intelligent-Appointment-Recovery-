import {
  BuiltInAgent,
  CopilotRuntime,
  InMemoryAgentRunner,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";
import { personalAgent } from "@/lib/copilot/personal-agent";
import { createDefaultChatAgent } from "@/lib/copilot/resolve-chat-agent";

const defaultAgent = createDefaultChatAgent();

const personalBuiltInAgent = new BuiltInAgent({
  type: "custom",
  factory: personalAgent,
});

const runtime = new CopilotRuntime({
  agents: {
    default: defaultAgent,
    personal: personalBuiltInAgent,
  },
  runner: new InMemoryAgentRunner(),
});

const app = createCopilotHonoHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);
