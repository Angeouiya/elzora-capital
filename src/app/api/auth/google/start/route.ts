import { NextRequest, NextResponse } from "next/server";
import {
  buildGoogleAuthorizationUrl,
  createPkceChallenge,
  getGoogleOAuthConfig,
  GOOGLE_OAUTH_COOKIES,
  GOOGLE_OAUTH_MAX_AGE_SECONDS,
  randomOAuthToken,
} from "@/lib/google-oauth";

export async function GET(req: NextRequest) {
  const config = getGoogleOAuthConfig(req.url);
  const locale = req.nextUrl.searchParams.get("locale") === "en" ? "en" : "fr";
  if (!config) {
    return NextResponse.redirect(new URL(`/?auth=google_unavailable&locale=${locale}`, req.url));
  }

  const state = randomOAuthToken();
  const nonce = randomOAuthToken();
  const verifier = randomOAuthToken(48);
  const codeChallenge = await createPkceChallenge(verifier);
  const authorizationUrl = buildGoogleAuthorizationUrl({ config, state, nonce, codeChallenge });
  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: config.appOrigin.startsWith("https://"),
    path: "/",
    maxAge: GOOGLE_OAUTH_MAX_AGE_SECONDS,
  };
  response.cookies.set(GOOGLE_OAUTH_COOKIES.state, state, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_COOKIES.nonce, nonce, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_COOKIES.verifier, verifier, cookieOptions);
  response.cookies.set(GOOGLE_OAUTH_COOKIES.locale, locale, cookieOptions);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
