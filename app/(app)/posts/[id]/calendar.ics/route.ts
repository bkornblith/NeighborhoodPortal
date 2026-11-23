import { createClient } from "@/lib/supabase/server";

const ics = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escText = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");

/** Calendar file so neighbors can add an event to Apple, Google or Outlook calendars. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: post } = await supabase.from("posts").select("id, title, body, starts_at, ends_at, location").eq("id", id).single();
  if (!post?.starts_at) return new Response("Not found", { status: 404 });
  const end = post.ends_at ?? new Date(new Date(post.starts_at).getTime() + 3600e3).toISOString();
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Amherst Woods//Portal//EN",
    "BEGIN:VEVENT",
    `UID:post-${post.id}@amherstwoods`,
    `DTSTAMP:${ics(new Date().toISOString())}`,
    `DTSTART:${ics(post.starts_at)}`,
    `DTEND:${ics(end)}`,
    `SUMMARY:${escText(post.title)}`,
    post.location ? `LOCATION:${escText(post.location)}` : "",
    `DESCRIPTION:${escText(post.body ?? "")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="event-${post.id}.ics"` },
  });
}
