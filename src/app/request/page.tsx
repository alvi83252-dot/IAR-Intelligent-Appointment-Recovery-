"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useIARStore } from "@/hooks/use-iar-store";

const availabilityOptions = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekend mornings",
  "Flexible",
];

export default function AppointmentRequestPage() {
  const router = useRouter();
  const submitRequest = useIARStore((s) => s.submitAppointmentRequest);
  const isProcessing = useIARStore((s) => s.isProcessing);

  const [symptoms, setSymptoms] = useState("");
  const [urgencyNotes, setUrgencyNotes] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(["Weekday mornings"]);

  const toggleAvailability = (option: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim()) return;

    await submitRequest({
      symptoms,
      availability: selectedAvailability,
      urgencyNotes,
    });

    router.push("/priority");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Request Appointment</h1>
        <p className="mt-2 text-muted-foreground">
          Your Personal Agent will coordinate with Research and Front Desk agents to find the best slot.
        </p>
      </motion.div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Appointment Details</CardTitle>
          <CardDescription>
            Describe your symptoms and availability. Agents will handle the rest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">Symptoms / Reason for visit</label>
              <Textarea
                placeholder="e.g. Persistent lower back pain for 2 weeks, worsening when sitting..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                required
                rows={4}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Additional urgency notes (optional)</label>
              <Input
                placeholder="e.g. Pain has been increasing over the past 3 days"
                value={urgencyNotes}
                onChange={(e) => setUrgencyNotes(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Availability</label>
              <div className="flex flex-wrap gap-2">
                {availabilityOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => toggleAvailability(option)}
                    className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedAvailability.includes(option)
                        ? "border-iar-teal bg-iar-teal/10 text-iar-teal"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              variant="premium"
              className="w-full"
              disabled={isProcessing || !symptoms.trim()}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Agents coordinating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Submit Request
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
