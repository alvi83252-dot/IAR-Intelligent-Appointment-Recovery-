import {
  BuiltInAgent,
  CopilotRuntime,
  InMemoryAgentRunner,
  createCopilotHonoHandler,
} from "@copilotkit/runtime/v2";
import { handle } from "hono/vercel";
import { IAR_AGENT_PROMPT, PERSONAL_AGENT_PROMPT } from "@/lib/copilot/iar-agent-prompt";
import { resolveChatModel } from "@/lib/copilot/resolve-model";

// Authenticate the Google model provider with either GOOGLE_API_KEY or the
// project's GEMINI_API_KEY (the Python agents use GEMINI_API_KEY).
if (!process.env.GOOGLE_API_KEY && process.env.GEMINI_API_KEY) {
  process.env.GOOGLE_API_KEY = process.env.GEMINI_API_KEY;
}

const chatModel = resolveChatModel();

const runtime = new CopilotRuntime({
  agents: {
    // Home page (/) general assistant — <CopilotChat> with no agent prop uses "default".
    default: new BuiltInAgent({ model: chatModel, prompt: IAR_AGENT_PROMPT }),
    // /copilot booking assistant — drives the generateAppointmentChoices generative UI tool.
    personal: new BuiltInAgent({ model: chatModel, prompt: PERSONAL_AGENT_PROMPT }),
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
