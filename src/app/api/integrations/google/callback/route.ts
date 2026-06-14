import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getGoogleOAuthClientConfig } from "@/lib/integrations/credentials";
import { getGoogleOAuthRedirectUri } from "@/lib/integrations/google-oauth";
import { isIntegrationsSetupAllowed, readIntegrationsStore, writeIntegrationsStore } from "@/lib/integrations/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isIntegrationsSetupAllowed()) {
    return NextResponse.redirect(new URL("/setup?error=setup_disabled", request.url));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/setup?error=${encodeURIComponent(error)}`, request.url));
  }

  const cookieStore = await cookies();
  const expectedState = cookieStore.get("iar_google_oauth_state")?.value;
  cookieStore.delete("iar_google_oauth_state");

  if (!code || !state || !expectedState || state !== expectedState) {
    return NextResponse.redirect(new URL("/setup?error=invalid_oauth_state", request.url));
  }

  const oauth = getGoogleOAuthClientConfig();
  if (!oauth) {
    return NextResponse.redirect(new URL("/setup?error=missing_google_client", request.url));
  }

  try {
    const redirectUri = getGoogleOAuthRedirectUri(request);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = (await tokenRes.json()) as {
      refresh_token?: string;
      access_token?: string;
      error?: string;
      error_description?: string;
    };

    const existing = readIntegrationsStore().google;
    const refreshToken = tokenData.refresh_token ?? existing?.refreshToken;

    if (!tokenRes.ok || !refreshToken) {
      const message = tokenData.error_description ?? tokenData.error ?? "No refresh token returned";
      return NextResponse.redirect(
        new URL(`/setup?error=${encodeURIComponent(message)}`, request.url)
      );
    }

    let senderEmail = existing?.senderEmail ?? "";
    if (tokenData.access_token) {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (userRes.ok) {
        const user = (await userRes.json()) as { email?: string };
        if (user.email) senderEmail = user.email;
      }
    }

    writeIntegrationsStore({
      google: {
        clientId: oauth.clientId,
        clientSecret: oauth.clientSecret,
        refreshToken,
        senderEmail,
        calendarId: existing?.calendarId ?? "primary",
      },
    });

    return NextResponse.redirect(new URL("/setup?google=connected", request.url));
  } catch (err) {
    const message = err instanceof Error ? err.message : "oauth_callback_failed";
    return NextResponse.redirect(new URL(`/setup?error=${encodeURIComponent(message)}`, request.url));
  }
}
