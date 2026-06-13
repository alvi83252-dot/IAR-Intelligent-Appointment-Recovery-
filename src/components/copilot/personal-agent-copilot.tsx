"use client";

import { FormEvent, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarCheck, Check, Clock, Loader2, MapPin, Send, Stethoscope } from "lucide-react";
import {
  useAgent,
  useAgentContext,
  useConfigureSuggestions,
  useFrontendTool,
  useSuggestions,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useIARStore } from "@/hooks/use-iar-store";
import { assessPriority } from "@/lib/priority";
import { cn } from "@/lib/utils";
import { pasAdapter } from "@/services/pas-adapter";
import { DEMO_PATIENT } from "@/services/mock-data";
import type { PriorityAssessment } from "@/types";
import type { PasSlot } from "@/types/pas";

type AppointmentChoicesArgs = {
  requestText: string;
};

type AppointmentChoicesResult = {
  requestText: string;
  assessment: PriorityAssessment;
  offers: PasSlot[];
};

const appointmentChoicesSchema = z.object({
  requestText: z.string().describe("The patient's plain-English appointment request."),
});

function parseResult(result: string | undefined): AppointmentChoicesResult | null {
  if (!result) return null;
  try {
    return JSON.parse(result) as AppointmentChoicesResult;
  } catch {
    return null;
  }
}

function formatSlot(slot: PasSlot) {
  return format(new Date(slot.dateTime), "EEE d MMM, h:mm a");
}

function AppointmentChoiceCard({
  result,
}: {
  result: AppointmentChoicesResult;
}) {
  const { agent } = useAgent({ agentId: "personal" });
  const { copilotkit } = useCopilotKit();
  const submitAppointmentRequest = useIARStore((state) => state.submitAppointmentRequest);
  const patientContact = useIARStore((state) => state.patientContact);
  const isProcessing = useIARStore((state) => state.isProcessing);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const handleSelect = async (slot: PasSlot) => {
    setSelectedSlotId(slot.id);
    const contact = patientContact ?? {
      name: DEMO_PATIENT.name,
      email: DEMO_PATIENT.email,
      phone: DEMO_PATIENT.phone,
    };
    const appointment = await submitAppointmentRequest({
      symptoms: result.requestText,
      availability: [formatSlot(slot)],
      preferredSlotId: slot.id,
      urgencyNotes: `Selected in CopilotKit UI. Priority: ${result.assessment.band}.`,
      patientName: contact.name,
      email: contact.email,
      phone: contact.phone,
    });

    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: `I selected ${formatSlot(slot)} with ${slot.providerName}. Please continue.`,
    });
    await copilotkit.runAgent({ agent });

    return appointment;
  };

  return (
    <Card className="border-iar-teal/30">
      <CardHeader className="space-y-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Priority {result.assessment.band}</Badge>
          <Badge className="bg-iar-teal/10 text-iar-teal hover:bg-iar-teal/20">
            {result.assessment.score}/100
          </Badge>
        </div>
        <CardTitle className="text-base">Choose an appointment slot</CardTitle>
        <p className="text-sm text-muted-foreground">{result.assessment.rationale}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {result.offers.map((slot) => {
          const selected = selectedSlotId === slot.id;
          return (
            <div
              key={slot.id}
              className={cn(
                "grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[1fr_auto]",
                selected && "border-iar-teal bg-iar-teal/5"
              )}
            >
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-iar-teal" />
                  {formatSlot(slot)}
                </div>
                <div className="grid gap-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Stethoscope className="h-4 w-4" />
                    {slot.providerName}
                  </span>
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {slot.practiceName}
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant={selected ? "default" : "outline"}
                disabled={isProcessing || Boolean(selectedSlotId)}
                onClick={() => void handleSelect(slot)}
              >
                {selected ? (
                  <>
                    <Check className="h-4 w-4" /> Selected
                  </>
                ) : (
                  <>
                    <CalendarCheck className="h-4 w-4" /> Book
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function AppointmentToolHost() {
  const timelineSnapshot = useIARStore((state) => state.timeline);
  const lastBookedAppointment = useIARStore((state) => state.lastBookedAppointment);
  const timeline = useMemo(() => timelineSnapshot.slice(0, 5), [timelineSnapshot]);

  useAgentContext({
    description: "The latest IAR timeline events and appointment booking state",
    value: {
      timeline: timeline.map((event) => ({
        title: event.title,
        description: event.description,
        timestamp: event.timestamp,
        agentId: event.agentId ?? null,
      })),
      lastBookedAppointment: lastBookedAppointment
        ? {
            clinician: lastBookedAppointment.providerName,
            start: lastBookedAppointment.dateTime,
            location: lastBookedAppointment.location,
          }
        : null,
    },
  });

  useConfigureSuggestions(
    {
      suggestions: [
        {
          title: "Book a GP slot",
          message: "I need a GP appointment for a persistent cough and weekday mornings are best.",
        },
        {
          title: "Back pain",
          message: "Can you find me an appointment for lower back pain that is getting worse?",
        },
        {
          title: "Rebook",
          message: "I need to rebook my GP appointment because I have a calendar conflict.",
        },
      ],
      consumerAgentId: "personal",
      available: "before-first-message",
    },
    []
  );

  useFrontendTool<AppointmentChoicesArgs>(
    {
      name: "generateAppointmentChoices",
      agentId: "personal",
      description:
        "Generate selectable GP appointment slot choices for the patient from their request.",
      parameters: appointmentChoicesSchema,
      followUp: false,
      handler: async ({ requestText }, { signal }) => {
        if (signal?.aborted) throw new Error("Appointment option generation cancelled.");
        const assessment = assessPriority(requestText);
        const offers = await pasAdapter.searchAvailability({
          urgent: assessment.band === "urgent" || assessment.band === "critical",
        });

        return JSON.stringify({
          requestText,
          assessment,
          offers: offers.slice(0, 3),
        } satisfies AppointmentChoicesResult);
      },
    },
    []
  );

  return null;
}

function contentAsText(message: unknown): string {
  const content = (message as { content?: unknown }).content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          return String((part as { text: unknown }).text);
        }
        return "";
      })
      .join("");
  }
  return "";
}

function toolCallsFromMessage(message: unknown) {
  const calls = (message as { toolCalls?: unknown }).toolCalls;
  return Array.isArray(calls) ? calls : [];
}

function toolCallName(toolCall: unknown): string {
  return String((toolCall as { function?: { name?: unknown }; name?: unknown }).function?.name ?? "");
}

function toolCallArgs(toolCall: unknown): AppointmentChoicesArgs | null {
  const raw = (toolCall as { function?: { arguments?: unknown } }).function?.arguments;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as AppointmentChoicesArgs;
  } catch {
    return null;
  }
}

function toolCallId(toolCall: unknown): string {
  return String((toolCall as { id?: unknown }).id ?? "");
}

function findToolResult(messages: unknown[], id: string): string | undefined {
  const result = messages.find(
    (message) =>
      (message as { role?: unknown }).role === "tool" &&
      String((message as { toolCallId?: unknown }).toolCallId ?? "") === id
  );
  return result ? contentAsText(result) : undefined;
}

function AppointmentToolCall({
  args,
  result,
}: {
  args: AppointmentChoicesArgs | null;
  result?: string;
}) {
  if (!result) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-iar-teal" />
          Checking priority and PAS ledger availability...
        </CardContent>
      </Card>
    );
  }

  const parsed = parseResult(result);
  if (!parsed) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          I could not render the appointment options for {args?.requestText ?? "that request"}.
        </CardContent>
      </Card>
    );
  }

  return <AppointmentChoiceCard result={parsed} />;
}

function PersonalAgentChat() {
  const { agent } = useAgent({ agentId: "personal" });
  const { copilotkit } = useCopilotKit();
  const { suggestions } = useSuggestions({ agentId: "personal" });
  const [input, setInput] = useState("");

  const sendMessage = async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || agent.isRunning) return;

    agent.addMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    });
    setInput("");
    await copilotkit.runAgent({ agent });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const messages = agent.messages;

  return (
    <div className="flex h-full min-h-[680px] flex-col">
      <div className="border-b border-border p-4">
        <h1 className="text-lg font-semibold">Personal Agent</h1>
        <p className="text-sm text-muted-foreground">
          Ask for a GP appointment and choose from generated slot options.
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Tell me what you need an appointment for. I will generate options you can choose from.
          </div>
        ) : null}

        {messages.map((message, index) => {
          const role = String((message as { role?: unknown }).role ?? "");
          if (role === "tool") return null;
          const text = contentAsText(message);
          const toolCalls = toolCallsFromMessage(message);

          return (
            <div
              key={String((message as { id?: unknown }).id ?? index)}
              className={cn("flex", role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[min(680px,100%)] space-y-3 rounded-lg border p-3 text-sm",
                  role === "user"
                    ? "border-iar-teal bg-iar-teal/10"
                    : "border-border bg-background"
                )}
              >
                {text ? <p className="whitespace-pre-wrap">{text}</p> : null}
                {toolCalls
                  .filter((toolCall) => toolCallName(toolCall) === "generateAppointmentChoices")
                  .map((toolCall) => {
                    const id = toolCallId(toolCall);
                    return (
                      <AppointmentToolCall
                        key={id}
                        args={toolCallArgs(toolCall)}
                        result={findToolResult(messages, id)}
                      />
                    );
                  })}
              </div>
            </div>
          );
        })}

        {agent.isRunning ? <Skeleton className="h-20 w-2/3 rounded-lg" /> : null}
      </div>

      {messages.length === 0 && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
          {suggestions.slice(0, 3).map((suggestion) => (
            <Button
              key={suggestion.title}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void sendMessage(suggestion.message)}
            >
              {suggestion.title}
            </Button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-4">
        <Textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the personal agent to book or rebook a GP appointment..."
          className="min-h-12 flex-1 resize-none"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void sendMessage(input);
            }
          }}
        />
        <Button type="submit" disabled={!input.trim() || agent.isRunning}>
          {agent.isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

export function PersonalAgentCopilot() {
  const lastBookedAppointment = useIARStore((state) => state.lastBookedAppointment);
  const contextValue = useMemo(
    () => ({
      confirmedAppointment: lastBookedAppointment
        ? {
            clinician: lastBookedAppointment.providerName,
            start: lastBookedAppointment.dateTime,
            location: lastBookedAppointment.location,
          }
        : null,
    }),
    [lastBookedAppointment]
  );

  useAgentContext({
    description: "Confirmed GP appointment from the IAR personal agent flow",
    value: contextValue,
  });

  return (
    <div className="grid min-h-[calc(100vh-4rem)] gap-4 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-6">
      <AppointmentToolHost />
      <section className="min-h-[680px] overflow-hidden rounded-lg border border-border bg-card">
        <PersonalAgentChat />
      </section>
      <aside className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Live IAR State</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Slot choices book through the existing PAS ledger flow, then the CopilotKit chat
          continues with the selected appointment.
        </p>
        {lastBookedAppointment ? (
          <div className="mt-4 rounded-lg border border-iar-teal/30 bg-iar-teal/5 p-3 text-sm">
            <p className="font-medium">{lastBookedAppointment.providerName}</p>
            <p className="mt-1 text-muted-foreground">
              {format(new Date(lastBookedAppointment.dateTime), "EEE d MMM, h:mm a")}
            </p>
            <p className="mt-1 text-muted-foreground">{lastBookedAppointment.location}</p>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
            No CopilotKit booking selected yet.
          </div>
        )}
      </aside>
    </div>
  );
}
