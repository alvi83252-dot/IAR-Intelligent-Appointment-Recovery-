import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleOAuthClientConfig } from "@/lib/integrations/credentials";
import { isIntegrationsSetupAllowed, readIntegrationsStore, writeIntegrationsStore } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

function getRedirectUri(request: Request): string {
  const url = new URL(request.url);
  return `${url.origin}/api/integrations/google/callback`;
}

export async function GET(request: Request) {
  if (!isIntegrationsSetupAllowed()) {
    return NextResponse.redirect(new URL("/setup?error=setup_disabled", request.url));
  }

  const { searchParams } = new URL(request.url);
  const senderEmail = searchParams.get("senderEmail")?.trim();

  if (senderEmail) {
    const existing = readIntegrationsStore().google;
    const oauth = getGoogleOAuthClientConfig();
    if (oauth || existing?.clientId) {
      writeIntegrationsStore({
        google: {
          clientId: oauth?.clientId ?? existing!.clientId,
          clientSecret: oauth?.clientSecret ?? existing!.clientSecret,
          refreshToken: existing?.refreshToken ?? "",
          senderEmail,
          calendarId: existing?.calendarId ?? "primary",
        },
      });
    }
  }

  const oauth = getGoogleOAuthClientConfig();
  if (!oauth) {
    return NextResponse.redirect(new URL("/setup?error=missing_google_client", request.url));
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("iar_google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = getRedirectUri(request);
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", oauth.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set(
    "scope",
    [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/calendar.events",
      "email",
      "profile",
    ].join(" ")
  );
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString());
}
