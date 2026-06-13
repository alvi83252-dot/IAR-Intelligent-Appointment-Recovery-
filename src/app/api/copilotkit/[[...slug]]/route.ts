import {
  BuiltInAgent,
  CopilotRuntime,
  InMemoryAgentRunner,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";
import { IAR_AGENT_PROMPT } from "@/lib/copilot/iar-agent-prompt";
import { resolveChatModel } from "@/lib/copilot/resolve-model";

const chatModel = resolveChatModel();

const agent = new BuiltInAgent({
  model: chatModel,
  prompt: IAR_AGENT_PROMPT,
});

const runtime = new CopilotRuntime({
  agents: {
    default: agent,
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
