import { NextResponse } from "next/server";
import { writeIntegrationsStore, isIntegrationsSetupAllowed } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!isIntegrationsSetupAllowed()) {
    return NextResponse.json({ error: "Setup is disabled in this environment." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      accountSid?: string;
      authToken?: string;
      phoneNumber?: string;
    };

    const accountSid = body.accountSid?.trim();
    const authToken = body.authToken?.trim();
    const phoneNumber = body.phoneNumber?.trim();

    if (!accountSid || !authToken || !phoneNumber) {
      return NextResponse.json(
        { error: "accountSid, authToken, and phoneNumber are required." },
        { status: 400 }
      );
    }

    writeIntegrationsStore({
      twilio: { accountSid, authToken, phoneNumber },
    });

    return NextResponse.json({ ok: true, message: "Twilio credentials saved locally." });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save Twilio credentials." },
      { status: 500 }
    );
  }
}
