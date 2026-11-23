import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Landing page for links in invite and password-reset emails. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next")?.startsWith("/") ? searchParams.get("next")! : "/";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL(type === "invite" ? `${next}?welcome=1` : next, request.url));
  }
  const msg = "That link has expired or was already used. Enter your email to get a new one.";
  return NextResponse.redirect(new URL(`/forgot-password?error=${encodeURIComponent(msg)}`, request.url));
}
