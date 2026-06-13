import { NextResponse } from "next/server";
import { isIntegrationsSetupAllowed, writeIntegrationsStore, readIntegrationsStore } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isIntegrationsSetupAllowed()) {
    return NextResponse.json({ error: "Setup is disabled in this environment." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      clientId?: string;
      clientSecret?: string;
      senderEmail?: string;
      calendarId?: string;
    };

    const clientId = body.clientId?.trim();
    const clientSecret = body.clientSecret?.trim();
    const senderEmail = body.senderEmail?.trim();
    const calendarId = body.calendarId?.trim() || "primary";

    if (!clientId || !clientSecret || !senderEmail) {
      return NextResponse.json(
        { error: "clientId, clientSecret, and senderEmail are required." },
        { status: 400 }
      );
    }

    const existing = readIntegrationsStore().google;
    writeIntegrationsStore({
      google: {
        clientId,
        clientSecret,
        refreshToken: existing?.refreshToken ?? "",
        senderEmail,
        calendarId,
      },
    });

    return NextResponse.json({ ok: true, message: "Google settings saved locally." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save Google settings." },
      { status: 500 }
    );
  }
}
