import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${req.nextUrl.origin}/api/auth/google/callback`;

  if (!clientId) {
    // If not configured with Google Cloud Console credentials, redirect to demo google auth handler
    return NextResponse.redirect(new URL("/api/auth/google/demo", req.url));
  }

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "online");

  return NextResponse.redirect(googleAuthUrl.toString());
}
