import { NextResponse } from "next/server";
import {
  getGmailSenderEmail,
  getGoogleOAuthClientConfig,
  getIntegrationStatus,
} from "@/lib/integrations/credentials";
import { getGoogleOAuthRedirectUri } from "@/lib/integrations/google-oauth";
import { readIntegrationsStore } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauth = getGoogleOAuthClientConfig();
  const store = readIntegrationsStore().google;
  const status = getIntegrationStatus();

  return NextResponse.json({
    clientId: oauth?.clientId ?? store?.clientId ?? "",
    hasClientSecret: !!(oauth?.clientSecret ?? store?.clientSecret),
    hasRefreshToken: status.googleCalendar.configured,
    senderEmail: getGmailSenderEmail() ?? store?.senderEmail ?? "",
    redirectUri: getGoogleOAuthRedirectUri(request),
    connectUrl: "/api/integrations/google/auth",
    readyToConnect: !!(oauth?.clientId && oauth?.clientSecret) && !status.gmail.configured,
    gmailConfigured: status.gmail.configured,
  });
}
