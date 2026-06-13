"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Mail, Phone, Send, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton, SpeakButton } from "@/components/access/voice-controls";
import { useIARStore } from "@/hooks/use-iar-store";
import { DEMO_PATIENT } from "@/services/mock-data";
import { useAccessMode } from "@/lib/voice/use-access-mode";

const availabilityOptions = [
  "Weekday mornings",
  "Weekday afternoons",
  "Weekend mornings",
  "Flexible",
];

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string) {
  return value.replace(/\D/g, "").length >= 10;
}

export default function AppointmentRequestPage() {
  const router = useRouter();
  const { isVoice } = useAccessMode();
  const submitRequest = useIARStore((s) => s.submitAppointmentRequest);
  const isProcessing = useIARStore((s) => s.isProcessing);

  const [patientName, setPatientName] = useState(DEMO_PATIENT.name);
  const [email, setEmail] = useState(DEMO_PATIENT.email);
  const [phone, setPhone] = useState(DEMO_PATIENT.phone);
  const [symptoms, setSymptoms] = useState("");
  const [urgencyNotes, setUrgencyNotes] = useState("");
  const [selectedAvailability, setSelectedAvailability] = useState<string[]>(["Weekday mornings"]);
  const [formError, setFormError] = useState<string | null>(null);

  const toggleAvailability = (option: string) => {
    setSelectedAvailability((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!symptoms.trim()) {
      setFormError("Please describe your symptoms.");
      return;
    }
    if (!patientName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!isValidEmail(email)) {
      setFormError("Please enter a valid email for confirmation.");
      return;
    }
    if (!isValidPhone(phone)) {
      setFormError("Please enter a valid phone number for SMS confirmation.");
      return;
    }

    await submitRequest({
      symptoms,
      availability: selectedAvailability,
      urgencyNotes,
      patientName: patientName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });

    router.push("/priority");
  };

  const contactValid =
    patientName.trim() &&
    isValidEmail(email) &&
    isValidPhone(phone) &&
    symptoms.trim();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold tracking-tight">Request Appointment</h1>
        <p className="mt-2 text-muted-foreground">
          Your Personal Agent will coordinate with Research and Front Desk agents to find the best slot.
        </p>
        <p className="mt-2 text-sm text-iar-teal">
          We will send an SMS to your phone and an email confirmation. Meetups are booked via Google Calendar and sync across linked calendars.
        </p>
        {isVoice && (
          <p className="mt-2 text-sm text-muted-foreground">
            Voice mode — use the microphone to describe symptoms, or type below.
          </p>
        )}
      </motion.div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Your details & appointment</CardTitle>
          <CardDescription>
            Phone and email are required so we can confirm by SMS and email after booking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" /> Full name
                </label>
                <Input
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Mail className="h-4 w-4" /> Email (confirmation)
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@gmail.com"
                />
              </div>
              <div>
                <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Phone className="h-4 w-4" /> Mobile (SMS confirmation)
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  autoComplete="tel"
                  placeholder="+44 7700 900000"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Symptoms / Reason for visit</label>
              <Textarea
                placeholder="e.g. Persistent lower back pain for 2 weeks, worsening when sitting..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                required
                rows={4}
              />
              {isVoice && (
                <VoiceInputButton
                  className="mt-3"
                  label="Describe symptoms by voice"
                  onTranscript={(text) => setSymptoms((prev) => (prev ? `${prev} ${text}` : text))}
                />
              )}
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
              {isVoice && (
                <SpeakButton
                  text={`Availability options: ${availabilityOptions.map((option, index) => `Option ${index + 1}, ${option}`).join(". ")}.`}
                  label="Hear availability options"
                  className="mb-3"
                />
              )}
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

            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}

            <Button
              type="submit"
              variant="premium"
              className="w-full"
              disabled={isProcessing || !contactValid}
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
