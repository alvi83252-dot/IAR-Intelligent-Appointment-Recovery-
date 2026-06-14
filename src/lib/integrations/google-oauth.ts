/** Redirect URI sent to Google OAuth — must match Google Cloud Console exactly. */
export function getGoogleOAuthRedirectUri(request: Request): string {
  const fromEnv = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (fromEnv) return fromEnv;

  const url = new URL(request.url);
  return `${url.origin}/api/integrations/google/callback`;
}
